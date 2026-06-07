import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';

type Factor = 'FACE' | 'IRIS' | 'FACE_AND_IRIS';

type ProfileStudent = {
  id: string;
  studentCode: string;
  fullName: string;
  classId?: string;
  sessionRemaining: number;
  biometricProfile?: { hasFace: boolean; hasIris: boolean; consentAt?: string; updatedAt?: string } | null;
};

function normalizeSignature(values: number[]) {
  return values.map((value) => Math.max(0, Math.min(255, Math.round(value)))).join(',');
}

function buildSignature(canvas: HTMLCanvasElement, video: HTMLVideoElement, mode: 'face' | 'iris') {
  const size = 16;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Không đọc được canvas camera');

  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  if (mode === 'iris') {
    const cropW = vw * 0.34;
    const cropH = vh * 0.18;
    ctx.drawImage(video, (vw - cropW) / 2, (vh - cropH) / 2, cropW, cropH, 0, 0, size, size);
  } else {
    const crop = Math.min(vw, vh) * 0.7;
    ctx.drawImage(video, (vw - crop) / 2, (vh - crop) / 2, crop, crop, 0, 0, size, size);
  }
  const data = ctx.getImageData(0, 0, size, size).data;
  const values: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    values.push(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
  }
  return normalizeSignature(values);
}

function captureSnapshot(canvas: HTMLCanvasElement, video: HTMLVideoElement) {
  const width = 360;
  const height = Math.round(width * ((video.videoHeight || 480) / (video.videoWidth || 640)));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.68);
}

export function BiometricAttendance() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState('');
  const [profiles, setProfiles] = useState<ProfileStudent[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [factor, setFactor] = useState<Factor>('FACE');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [antiSpoofPassed, setAntiSpoofPassed] = useState(false);
  const [autoMark, setAutoMark] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<any>(null);

  const selectedStudent = useMemo(() => profiles.find((student) => student.id === selectedStudentId), [profiles, selectedStudentId]);
  const enrolledCount = profiles.filter((student) => student.biometricProfile?.hasFace || student.biometricProfile?.hasIris).length;

  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data));
    return () => stopCamera();
  }, []);

  useEffect(() => {
    loadProfiles();
    loadLogs();
  }, [classId]);

  async function loadProfiles() {
    const res = await api.get(`/biometrics/profiles${classId ? `?classId=${classId}` : ''}`);
    setProfiles(res.data);
    if (!selectedStudentId && res.data[0]) setSelectedStudentId(res.data[0].id);
  }

  async function loadLogs() {
    const res = await api.get(`/biometrics/logs${classId ? `?classId=${classId}` : ''}`);
    setLogs(res.data);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      setMessage('Camera đã bật. Đặt học viên nhìn thẳng, đủ sáng, không đeo khẩu trang/kính tối khi đăng ký mẫu.');
    } catch (error) {
      setMessage('Không mở được camera. Vui lòng cấp quyền camera cho trình duyệt hoặc kiểm tra HTTPS khi chạy online.');
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  function collectBiometricPayload() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraOn) throw new Error('Camera chưa bật');
    const payload: any = { snapshotUrl: captureSnapshot(canvas, video) };
    if (factor === 'FACE' || factor === 'FACE_AND_IRIS') payload.faceSignature = buildSignature(canvas, video, 'face');
    if (factor === 'IRIS' || factor === 'FACE_AND_IRIS') payload.irisSignature = buildSignature(canvas, video, 'iris');
    return payload;
  }

  async function enrollStudent() {
    if (!selectedStudentId) return setMessage('Vui lòng chọn học viên cần đăng ký mẫu');
    setLoading(true);
    setResult(null);
    try {
      const payload = collectBiometricPayload();
      await api.post('/biometrics/enroll', {
        studentId: selectedStudentId,
        faceSignature: payload.faceSignature,
        irisSignature: payload.irisSignature,
        faceSnapshotUrl: payload.snapshotUrl,
        irisSnapshotUrl: factor !== 'FACE' ? payload.snapshotUrl : undefined,
        consentNote: 'Phụ huynh/CLB đã đồng ý dùng sinh trắc học để điểm danh nội bộ.',
      });
      await loadProfiles();
      setMessage(`Đã đăng ký mẫu sinh trắc học cho ${selectedStudent?.fullName || 'học viên'}.`);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || error.message || 'Không đăng ký được mẫu sinh trắc học');
    } finally {
      setLoading(false);
    }
  }

  async function recognizeAndMark() {
    setLoading(true);
    setResult(null);
    try {
      const payload = collectBiometricPayload();
      const res = await api.post('/biometrics/recognize', {
        classId: classId || undefined,
        factor,
        faceSignature: payload.faceSignature,
        irisSignature: payload.irisSignature,
        snapshotUrl: payload.snapshotUrl,
        livenessPassed,
        antiSpoofPassed,
        autoMark,
        date,
        threshold: factor === 'FACE_AND_IRIS' ? 74 : 72,
      });
      setResult(res.data);
      await loadLogs();
      setMessage(res.data.message || 'Đã xử lý nhận diện');
    } catch (error: any) {
      setMessage(error?.response?.data?.message || error.message || 'Không nhận diện được học viên');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">AI Attendance</p>
          <h1 className="text-2xl font-black text-brandForest">Điểm danh bằng khuôn mặt / mống mắt</h1>
          <p className="max-w-3xl text-sm text-slate-500">Bật camera để đăng ký mẫu cho học viên và nhận diện khi điểm danh. Bản này có kiến trúc sẵn sàng nâng cấp sang Face Recognition/Liveness thật; camera thường chỉ nên dùng như bản thử nghiệm nội bộ.</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">Đã đăng ký mẫu: {enrolledCount}/{profiles.length}</div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="card space-y-4">
          <div className="overflow-hidden rounded-[2rem] bg-slate-950">
            <video ref={videoRef} playsInline muted className="aspect-video w-full object-cover" />
            {!cameraOn && <div className="flex aspect-video items-center justify-center text-center text-sm font-bold text-white">Camera chưa bật</div>}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="grid gap-2 sm:grid-cols-3">
            <button className="btn-primary" onClick={startCamera} disabled={cameraOn}>Bật camera</button>
            <button className="btn-soft" onClick={stopCamera} disabled={!cameraOn}>Tắt camera</button>
            <button className="rounded-2xl bg-orange-500 px-4 py-3 font-black text-white shadow-lg shadow-orange-200 disabled:opacity-50" onClick={recognizeAndMark} disabled={!cameraOn || loading}>Nhận diện & điểm danh</button>
          </div>
          <div className="rounded-3xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-800">
            <b>Lưu ý quan trọng:</b> Nhận diện mống mắt chính xác cần camera/SDK chuyên dụng. Webcam/điện thoại thường chỉ tạo mẫu thử nghiệm từ vùng mắt, không nên xem là xác thực sinh trắc học cấp ngân hàng.
          </div>
        </div>

        <div className="card space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="input" value={classId} onChange={(event) => setClassId(event.target.value)}>
              <option value="">Tất cả lớp / chọn lớp</option>
              {classes.map((klass) => <option key={klass.id} value={klass.id}>{klass.name} {klass.coach?.fullName ? `- ${klass.coach.fullName}` : ''}</option>)}
            </select>
            <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            <select className="input" value={factor} onChange={(event) => setFactor(event.target.value as Factor)}>
              <option value="FACE">Khuôn mặt</option>
              <option value="IRIS">Mống mắt</option>
              <option value="FACE_AND_IRIS">Khuôn mặt + mống mắt</option>
            </select>
            <select className="input" value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
              <option value="">Chọn học viên để đăng ký mẫu</option>
              {profiles.map((student) => <option key={student.id} value={student.id}>{student.studentCode} - {student.fullName}</option>)}
            </select>
          </div>

          <div className="grid gap-3 rounded-3xl bg-slate-50 p-4 text-sm">
            <label className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={livenessPassed} onChange={(event) => setLivenessPassed(event.target.checked)} /><span><b>Đã kiểm tra người thật</b><br /><span className="text-slate-500">Cho học viên chớp mắt, quay đầu nhẹ hoặc đọc mã ngẫu nhiên trước camera.</span></span></label>
            <label className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={antiSpoofPassed} onChange={(event) => setAntiSpoofPassed(event.target.checked)} /><span><b>Đã kiểm tra chống điểm danh hộ</b><br /><span className="text-slate-500">Không dùng ảnh chụp, video phát lại, màn hình điện thoại hoặc người đứng thay.</span></span></label>
            <label className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={autoMark} onChange={(event) => setAutoMark(event.target.checked)} /><span><b>Tự động lưu điểm danh khi đạt ngưỡng</b><br /><span className="text-slate-500">Nếu tắt, hệ thống chỉ trả kết quả nhận diện để HLV/Admin xác nhận thủ công.</span></span></label>
          </div>

          <button className="btn-primary w-full" onClick={enrollStudent} disabled={!cameraOn || !selectedStudentId || loading}>Đăng ký / cập nhật mẫu cho học viên</button>
          {message && <div className="rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</div>}
          {result && <ResultCard result={result} />}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 text-lg font-black text-brandForest">Danh sách mẫu sinh trắc học</h2>
          <div className="space-y-2">
            {profiles.map((student) => <div key={student.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm">
              <div><b>{student.fullName}</b><p className="text-slate-500">{student.studentCode} • Còn {student.sessionRemaining} buổi</p></div>
              <div className="flex gap-2">
                <Badge active={Boolean(student.biometricProfile?.hasFace)} label="Face" />
                <Badge active={Boolean(student.biometricProfile?.hasIris)} label="Iris" />
              </div>
            </div>)}
          </div>
        </div>
        <div className="card">
          <h2 className="mb-3 text-lg font-black text-brandForest">Log nhận diện gần đây</h2>
          <div className="space-y-2">
            {logs.map((log) => <div key={log.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between"><b>{log.student?.fullName || 'Không xác định'}</b><span className="font-black text-emerald-700">{Math.round(log.confidence)}%</span></div>
              <p className="text-slate-500">{log.class?.name || 'Chưa có lớp'} • {log.factor} • {log.result} • {new Date(log.createdAt).toLocaleString('vi-VN')}</p>
            </div>)}
            {!logs.length && <p className="text-sm text-slate-500">Chưa có log nhận diện.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ active, label }: { active: boolean; label: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-black ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>{label}</span>;
}

function ResultCard({ result }: { result: any }) {
  const matched = result?.matched;
  return <div className={`rounded-3xl p-4 text-sm ${matched ? 'bg-emerald-50 text-emerald-800' : 'bg-orange-50 text-orange-800'}`}>
    <p className="text-xs font-black uppercase tracking-[0.18em]">Kết quả nhận diện</p>
    <h3 className="mt-1 text-xl font-black">{matched ? result.student?.fullName : 'Chưa xác nhận được học viên'}</h3>
    <p>Độ tin cậy: <b>{result.confidence}%</b> {result.faceScore ? `• Face ${result.faceScore}%` : ''} {result.irisScore ? `• Iris ${result.irisScore}%` : ''}</p>
    <p>Trạng thái: <b>{result.result}</b> {result.attendanceId ? '• Đã lưu điểm danh' : ''}</p>
  </div>;
}
