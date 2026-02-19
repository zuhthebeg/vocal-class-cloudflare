/**
 * AI 챗봇 API - Gemini 연동
 *
 * 엔드포인트:
 * - POST /api/chatbot - 새 대화 시작 또는 메시지 전송
 * - GET /api/chatbot?sessionKey={key} - 대화 히스토리 조회
 */

interface Env {
  DB: D1Database;
  GEMINI_API_KEY?: string;  // Gemini API 키 (환경 변수)
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface TeacherProfile {
  teacher_id: number;
  teacher_name: string;
  category_name: string;
  bio?: string;
  certification?: string;
  hourly_rate?: number;
}

interface StudentContext {
  studentName: string;
  totalClasses: number;
  totalAttendance: number;
  lastClassDate?: string;
  lastAttendanceDate?: string;
  nextBookingDate?: string;
  nextBookingTime?: string;
  upcomingBookings: Array<{date: string; time: string}>;
}

interface TeacherContext {
  studentName: string;
  startDate?: string;
  endDate?: string;
  paymentStatus: string;
  bankAccount?: string;
  notes?: string;
  totalClasses: number;
  totalAttendance: number;
  totalBookingRequests: number;
  pendingBookings: Array<{id: number; date: string; time: string; requestedAt: string}>;
  approvedBookings: Array<{id: number; date: string; time: string}>;
  recentChats: Array<{role: string; content: string; created_at: string}>;
}

/**
 * 시스템 프롬프트 생성 (학생 모드 또는 강사 모드)
 */
function buildSystemPrompt(
  mode: 'student' | 'teacher',
  profile?: TeacherProfile,
  studentContext?: StudentContext,
  teacherContext?: TeacherContext
): string {
  if (mode === 'teacher' && teacherContext) {
    // 강사 모드: 수강생 관리용 챗봇
    const classPeriod = teacherContext.startDate && teacherContext.endDate
      ? `${teacherContext.startDate} ~ ${teacherContext.endDate}`
      : teacherContext.startDate
      ? `${teacherContext.startDate}부터`
      : '정보 없음';

    let prompt = `당신은 강사님의 AI 수강생 관리 비서입니다.

**수강생 정보 (${teacherContext.studentName}님):**
- 수업 기간: ${classPeriod}
- 입금 계좌: ${teacherContext.bankAccount || '정보 없음'}
- 입금 상태: ${teacherContext.paymentStatus === 'paid' ? '완납' : '미납'}
- 총 수강 횟수: ${teacherContext.totalClasses}회
- 총 출석 횟수: ${teacherContext.totalAttendance}회
- 총 예약 신청 횟수: ${teacherContext.totalBookingRequests}회
- 메모: ${teacherContext.notes || '없음'}
`;

    if (teacherContext.pendingBookings.length > 0) {
      prompt += `\n**대기 중인 예약 요청:**\n`;
      teacherContext.pendingBookings.forEach(b => {
        prompt += `- ID ${b.id}: ${b.date} ${b.time} (신청 시간: ${b.requestedAt})\n`;
      });
    } else {
      prompt += `\n**대기 중인 예약 요청:** 없음\n`;
    }

    if (teacherContext.approvedBookings.length > 0) {
      prompt += `\n**승인된 예약:**\n`;
      teacherContext.approvedBookings.forEach(b => {
        prompt += `- ${b.date} ${b.time}\n`;
      });
    }

    if (teacherContext.recentChats.length > 0) {
      prompt += `\n**수강생의 최근 AI 챗봇 문의 내역 (최근 5개):**\n`;
      teacherContext.recentChats.forEach(chat => {
        prompt += `- [${chat.created_at}] ${chat.role === 'user' ? '질문' : '답변'}: ${chat.content.substring(0, 100)}...\n`;
      });
    }

    prompt += `
**역할 및 지침:**
1. 강사님의 질문에 친절하고 정확하게 답변하세요.
2. 수강생의 정보, 출석 현황, 예약 현황에 대한 질문에 위 정보를 바탕으로 답변하세요.
3. 예약 요청 승인/거절 요청 시, approve_booking 함수를 호출하세요.
4. 수강생의 챗봇 문의 내역을 참고하여 수강생이 궁금해하는 점이나 관심사를 파악해주세요.
5. 항상 존댓말을 사용하고, 전문적인 톤을 유지하세요.

**예약 승인 지침:**
- 강사님이 "예약 승인해줘", "승인할게" 등으로 요청하면 approve_booking 함수를 호출하세요.
- 거절 시에도 approve_booking 함수를 'rejected' 상태로 호출하세요.
`;

    return prompt;
  } else if (profile) {
    // 학생 모드: 강사 상담용 챗봇
    let prompt = `당신은 ${profile.teacher_name} 강사님의 AI 상담 비서입니다.

**강사 정보:**
- 이름: ${profile.teacher_name}
- 카테고리: ${profile.category_name}
- 자기소개: ${profile.bio || '정보 없음'}
- 경력/자격증: ${profile.certification || '정보 없음'}
- 시간당 수업료: ${profile.hourly_rate ? profile.hourly_rate.toLocaleString() + '원' : '문의 요망'}
`;

    // 학생 컨텍스트가 있으면 추가
    if (studentContext) {
      prompt += `
**수강생 정보 (${studentContext.studentName}님):**
- 총 수강 횟수: ${studentContext.totalClasses}회
- 총 출석 횟수: ${studentContext.totalAttendance}회
- 마지막 수업: ${studentContext.lastClassDate || '수업 이력 없음'}
- 마지막 출석: ${studentContext.lastAttendanceDate || '출석 이력 없음'}
- 다음 예약: ${studentContext.nextBookingDate ? `${studentContext.nextBookingDate} ${studentContext.nextBookingTime}` : '예약 없음'}
`;

      if (studentContext.upcomingBookings.length > 1) {
        prompt += `- 예정된 수업: ${studentContext.upcomingBookings.map(b => `${b.date} ${b.time}`).join(', ')}\n`;
      }
    }

    prompt += `
**역할 및 지침:**
1. 수강생의 질문에 친절하고 정확하게 답변하세요.
2. 강사님의 수업 방식, 경력, 수업료 등에 대해 안내하세요.
${studentContext ? '3. 수강생의 수업 이력이나 출석 현황, 예약 일정에 대한 질문에 위 정보를 바탕으로 답변하세요.' : '3. 개인정보(연락처, 주소, 계좌번호 등)는 절대 공유하지 마세요.'}
4. 확실하지 않은 정보는 "강사님께 직접 문의해주세요"라고 안내하세요.
${studentContext ? '5. 수업 예약 요청 시, 날짜와 시간을 파악하여 create_booking 함수를 호출하세요.' : '5. 예약 문의 시, 웹사이트에서 직접 예약할 수 있다고 안내하세요.'}
6. 항상 존댓말을 사용하고, 전문적이면서도 친근한 톤을 유지하세요.

**예약 관련 지침:**
- "내일", "모레", "다음주 월요일" 등의 표현을 YYYY-MM-DD 형식으로 변환하세요.
- 시간은 24시간 형식 HH:MM으로 변환하세요 (예: "저녁 8시" → "20:00", "오전 10시" → "10:00")
- 오늘 날짜는 ${new Date().toISOString().split('T')[0]} 입니다.

**금지 사항:**
- 다른 강사 비교 또는 비판
- 의학적/법률적 조언 제공
- 강사님이 제공하지 않은 정보 지어내기
- 개인정보 수집 또는 공유
`;

    return prompt;
  }

  return '';
}

/**
 * Gemini API 호출 (Function Calling 지원)
 */
async function callGeminiAPI(
  apiKey: string,
  messages: ChatMessage[],
  enableFunctionCalling: boolean = false,
  mode: 'student' | 'teacher' = 'student'
): Promise<{ reply: string; functionCall?: any }> {
  const url = 'https://gateway.ai.cloudflare.com/v1/3d0681b782422e56226a0a1df4a0e8b2/travly-ai-gateway/google-ai-studio/v1beta/models/gemini-2.5-flash:generateContent';

  // Gemini API 형식으로 변환
  const contents = messages
    .filter(m => m.role !== 'system')  // system 메시지는 제외
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  // 시스템 프롬프트를 첫 번째 user 메시지에 포함
  const systemMessage = messages.find(m => m.role === 'system');
  if (systemMessage && contents.length > 0 && contents[0].role === 'user') {
    contents[0].parts[0].text = `${systemMessage.content}\n\n사용자 질문: ${contents[0].parts[0].text}`;
  }

  const requestBody: any = { contents };

  // Function Calling 설정
  if (enableFunctionCalling) {
    if (mode === 'student') {
      // 학생 모드: create_booking 함수
      requestBody.tools = [{
        function_declarations: [{
          name: 'create_booking',
          description: '수업 예약을 생성합니다. 사용자가 예약 요청을 하면 이 함수를 호출하세요.',
          parameters: {
            type: 'object',
            properties: {
              booking_date: {
                type: 'string',
                description: '예약 날짜 (YYYY-MM-DD 형식)'
              },
              time_slots: {
                type: 'array',
                items: { type: 'string' },
                description: '가능한 시간대 목록 (HH:MM 형식, 예: ["20:00", "21:00"])'
              }
            },
            required: ['booking_date', 'time_slots']
          }
        }]
      }];
    } else {
      // 강사 모드: approve_booking 함수
      requestBody.tools = [{
        function_declarations: [{
          name: 'approve_booking',
          description: '예약 요청을 승인하거나 거절합니다. 강사가 예약 승인/거절 요청을 하면 이 함수를 호출하세요.',
          parameters: {
            type: 'object',
            properties: {
              booking_id: {
                type: 'number',
                description: '예약 ID (대기 중인 예약 목록에서 확인)'
              },
              status: {
                type: 'string',
                enum: ['approved', 'rejected'],
                description: '승인(approved) 또는 거절(rejected)'
              }
            },
            required: ['booking_id', 'status']
          }
        }]
      }];
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Gemini API error:', error);
    throw new Error(`Gemini API failed: ${response.status}`);
  }

  const data = await response.json();

  // Function Call 확인
  const functionCall = data.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall);

  if (functionCall) {
    return {
      reply: '',
      functionCall: functionCall.functionCall
    };
  }

  // 일반 텍스트 응답
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) {
    throw new Error('Gemini API returned empty response');
  }

  return { reply };
}

/**
 * 강사 프로필 조회
 */
async function getTeacherProfile(db: D1Database, teacherId: number): Promise<TeacherProfile | null> {
  const result = await db.prepare(`
    SELECT
      u.id as teacher_id,
      u.name as teacher_name,
      lc.name as category_name,
      tp.bio,
      tp.certification,
      tp.hourly_rate
    FROM users u
    LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
    LEFT JOIN lesson_categories lc ON tp.lesson_category_id = lc.id
    WHERE u.id = ? AND u.role = 'teacher'
  `).bind(teacherId).first<TeacherProfile>();

  return result;
}

/**
 * 학생 컨텍스트 조회
 */
async function getStudentContext(
  db: D1Database,
  studentId: number,
  teacherId: number
): Promise<StudentContext | null> {
  // 학생 이름 조회
  const student = await db.prepare(`
    SELECT name FROM users WHERE id = ?
  `).bind(studentId).first<{ name: string }>();

  if (!student) {
    return null;
  }

  // 완료된 수업 수 조회 (해당 강사)
  const completedBookings = await db.prepare(`
    SELECT COUNT(*) as count
    FROM bookings
    WHERE student_id = ? AND teacher_id = ? AND status = 'completed'
  `).bind(studentId, teacherId).first<{ count: number }>();

  // 출석 기록 조회 (해당 강사 - bookings를 통해)
  const attendanceResult = await db.prepare(`
    SELECT COUNT(a.id) as count, MAX(a.attended_at) as last_date
    FROM attendances a
    LEFT JOIN bookings b ON a.booking_id = b.id
    WHERE a.student_id = ? AND (b.teacher_id = ? OR b.teacher_id IS NULL)
  `).bind(studentId, teacherId).first<{ count: number; last_date: string }>();

  // 마지막 수업 날짜 조회
  const lastBooking = await db.prepare(`
    SELECT booking_date, time_slot
    FROM bookings
    WHERE student_id = ? AND teacher_id = ? AND status = 'completed'
    ORDER BY booking_date DESC, time_slot DESC
    LIMIT 1
  `).bind(studentId, teacherId).first<{ booking_date: string; time_slot: string }>();

  // 다가오는 예약 조회 (승인됨)
  const today = new Date().toISOString().split('T')[0];
  const { results: upcomingBookingsRaw } = await db.prepare(`
    SELECT booking_date, time_slot
    FROM bookings
    WHERE student_id = ? AND teacher_id = ?
      AND status = 'approved'
      AND booking_date >= ?
    ORDER BY booking_date ASC, time_slot ASC
    LIMIT 5
  `).bind(studentId, teacherId, today).all<{ booking_date: string; time_slot: string }>();

  return {
    studentName: student.name,
    totalClasses: completedBookings?.count || 0,
    totalAttendance: attendanceResult?.count || 0,
    lastClassDate: lastBooking?.booking_date || undefined,
    lastAttendanceDate: attendanceResult?.last_date ? attendanceResult.last_date.split(' ')[0] : undefined,
    nextBookingDate: upcomingBookingsRaw[0]?.booking_date || undefined,
    nextBookingTime: upcomingBookingsRaw[0]?.time_slot || undefined,
    upcomingBookings: upcomingBookingsRaw.map(b => ({
      date: b.booking_date,
      time: b.time_slot
    }))
  };
}

/**
 * 강사 컨텍스트 조회 (강사 모드 - 수강생 관리)
 */
async function getTeacherContext(
  db: D1Database,
  studentId: number,
  teacherId: number
): Promise<TeacherContext | null> {
  // 학생 기본 정보 조회
  const student = await db.prepare(`
    SELECT name, start_date, end_date, payment_status, bank_account, notes
    FROM users
    WHERE id = ? AND role = 'student'
  `).bind(studentId).first<{
    name: string;
    start_date: string;
    end_date: string;
    payment_status: string;
    bank_account: string;
    notes: string;
  }>();

  if (!student) {
    return null;
  }

  // 완료된 수업 수 조회
  const completedBookings = await db.prepare(`
    SELECT COUNT(*) as count
    FROM bookings
    WHERE student_id = ? AND teacher_id = ? AND status = 'completed'
  `).bind(studentId, teacherId).first<{ count: number }>();

  // 출석 기록 조회
  const attendanceResult = await db.prepare(`
    SELECT COUNT(a.id) as count
    FROM attendances a
    LEFT JOIN bookings b ON a.booking_id = b.id
    WHERE a.student_id = ? AND (b.teacher_id = ? OR b.teacher_id IS NULL)
  `).bind(studentId, teacherId).first<{ count: number }>();

  // 대기 중인 예약 요청 조회
  const { results: pendingBookingsRaw } = await db.prepare(`
    SELECT id, booking_date, time_slot, created_at
    FROM bookings
    WHERE student_id = ? AND teacher_id = ? AND status = 'pending'
    ORDER BY booking_date ASC, time_slot ASC
  `).bind(studentId, teacherId).all<{ id: number; booking_date: string; time_slot: string; created_at: string }>();

  // 승인된 예약 조회
  const today = new Date().toISOString().split('T')[0];
  const { results: approvedBookingsRaw } = await db.prepare(`
    SELECT id, booking_date, time_slot
    FROM bookings
    WHERE student_id = ? AND teacher_id = ? AND status = 'approved'
      AND booking_date >= ?
    ORDER BY booking_date ASC, time_slot ASC
    LIMIT 5
  `).bind(studentId, teacherId, today).all<{ id: number; booking_date: string; time_slot: string }>();

  // 수강생의 최근 챗봇 대화 내역 조회 (최근 5개 메시지)
  const { results: recentChatsRaw } = await db.prepare(`
    SELECT cl.role, cl.content, cl.created_at
    FROM chat_logs cl
    JOIN chat_sessions cs ON cl.session_id = cs.id
    WHERE cs.teacher_id = ? AND cl.role IN ('user', 'assistant')
    ORDER BY cl.created_at DESC
    LIMIT 5
  `).bind(teacherId).all<{ role: string; content: string; created_at: string }>();

  return {
    studentName: student.name,
    startDate: student.start_date,
    endDate: student.end_date,
    paymentStatus: student.payment_status || 'unpaid',
    bankAccount: student.bank_account,
    notes: student.notes,
    totalClasses: completedBookings?.count || 0,
    totalAttendance: attendanceResult?.count || 0,
    pendingBookings: pendingBookingsRaw.map(b => ({
      id: b.id,
      date: b.booking_date,
      time: b.time_slot,
      requestedAt: b.created_at
    })),
    approvedBookings: approvedBookingsRaw.map(b => ({
      id: b.id,
      date: b.booking_date,
      time: b.time_slot
    })),
    recentChats: recentChatsRaw.map(c => ({
      role: c.role,
      content: c.content,
      created_at: c.created_at
    }))
  };
}

/**
 * 대화 세션 생성 또는 조회
 */
async function getOrCreateSession(
  db: D1Database,
  sessionKey: string,
  teacherId: number
): Promise<{ id: number; session_key: string }> {
  // 기존 세션 조회
  const existing = await db.prepare(`
    SELECT id, session_key FROM chat_sessions
    WHERE session_key = ? AND teacher_id = ?
  `).bind(sessionKey, teacherId).first<{ id: number; session_key: string }>();

  if (existing) {
    return existing;
  }

  // 새 세션 생성
  const result = await db.prepare(`
    INSERT INTO chat_sessions (teacher_id, session_key)
    VALUES (?, ?)
    RETURNING id, session_key
  `).bind(teacherId, sessionKey).first<{ id: number; session_key: string }>();

  return result!;
}

/**
 * 대화 히스토리 조회
 */
async function getChatHistory(
  db: D1Database,
  sessionId: number,
  limit: number = 10
): Promise<ChatMessage[]> {
  const { results } = await db.prepare(`
    SELECT role, content
    FROM chat_logs
    WHERE session_id = ?
    ORDER BY created_at ASC
    LIMIT ?
  `).bind(sessionId, limit).all<ChatMessage>();

  return results;
}

/**
 * 메시지 저장
 */
async function saveMessage(
  db: D1Database,
  sessionId: number,
  teacherId: number,
  role: 'user' | 'assistant' | 'system',
  content: string
): Promise<void> {
  await db.prepare(`
    INSERT INTO chat_logs (session_id, teacher_id, role, content)
    VALUES (?, ?, ?, ?)
  `).bind(sessionId, teacherId, role, content).run();

  // 세션 메시지 카운트 및 마지막 메시지 시간 업데이트
  await db.prepare(`
    UPDATE chat_sessions
    SET message_count = message_count + 1,
        last_message_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(sessionId).run();
}

/**
 * POST /api/chatbot - 챗봇 메시지 전송
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { DB, GEMINI_API_KEY } = context.env;

  // Gemini API 키 확인
  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Gemini API key not configured. Please set GEMINI_API_KEY in wrangler.toml'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const body = await context.request.json() as {
      teacherId?: number;
      message: string;
      sessionKey?: string;
      studentId?: number;
      mode?: 'student' | 'teacher';
    };

    const { teacherId, message, sessionKey, studentId, mode = 'student' } = body;

    // 입력 검증
    if (!message) {
      return new Response(JSON.stringify({
        success: false,
        error: 'message is required'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    let systemPrompt: string;
    let effectiveTeacherId: number;
    let profile: TeacherProfile | null = null;
    let studentContext: StudentContext | undefined;
    let teacherContext: TeacherContext | undefined;

    if (mode === 'teacher') {
      // 강사 모드: studentId 필수, teacherId는 로그인한 강사
      if (!studentId || !teacherId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'studentId and teacherId are required for teacher mode'
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      effectiveTeacherId = teacherId;

      // 강사 컨텍스트 조회 (수강생 정보)
      teacherContext = await getTeacherContext(DB, studentId, teacherId) || undefined;
      if (!teacherContext) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Student not found'
        }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      // 시스템 프롬프트 생성 (강사 모드)
      systemPrompt = buildSystemPrompt(mode, undefined, undefined, teacherContext);
    } else {
      // 학생 모드: teacherId 필수, studentId는 선택적
      if (!teacherId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'teacherId is required for student mode'
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      effectiveTeacherId = teacherId;

      // 강사 프로필 조회
      profile = await getTeacherProfile(DB, teacherId);
      if (!profile) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Teacher not found'
        }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      // 학생 컨텍스트 조회 (선택적)
      if (studentId) {
        studentContext = await getStudentContext(DB, studentId, teacherId) || undefined;
      }

      // 시스템 프롬프트 생성 (학생 모드)
      systemPrompt = buildSystemPrompt(mode, profile, studentContext);
    }

    // 세션 생성 또는 조회
    const generatedSessionKey = sessionKey || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session = await getOrCreateSession(DB, generatedSessionKey, effectiveTeacherId);

    // 대화 히스토리 조회
    const history = await getChatHistory(DB, session.id, 10);

    // 메시지 배열 구성 (시스템 프롬프트 + 히스토리 + 새 메시지)
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message }
    ];

    // Gemini API 호출 (Function Calling 활성화)
    const enableFunctionCalling = mode === 'student' ? !!studentId : true;
    const result = await callGeminiAPI(GEMINI_API_KEY, messages, enableFunctionCalling, mode);

    // 사용자 메시지 저장
    await saveMessage(DB, session.id, effectiveTeacherId, 'user', message);

    // Function Call 처리
    if (result.functionCall) {
      if (result.functionCall.name === 'create_booking') {
        // 학생 모드: 예약 생성
        const args = result.functionCall.args;

        // 확인용 메시지 생성
        const confirmMessage = `다음과 같이 예약 신청하시겠습니까?\n\n📅 날짜: ${args.booking_date}\n🕐 희망 시간: ${args.time_slots.join(', ')}\n\n예약을 확정하시려면 "확인" 버튼을 눌러주세요.`;

        // AI 응답 저장
        await saveMessage(DB, session.id, effectiveTeacherId, 'assistant', confirmMessage);

        return new Response(JSON.stringify({
          success: true,
          sessionKey: session.session_key,
          reply: confirmMessage,
          bookingRequest: {
            booking_date: args.booking_date,
            time_slots: args.time_slots
          },
          messageCount: history.length + 2
        }), { headers: { 'Content-Type': 'application/json' } });
      } else if (result.functionCall.name === 'approve_booking') {
        // 강사 모드: 예약 승인/거절
        const args = result.functionCall.args;

        // 확인용 메시지 생성
        const statusText = args.status === 'approved' ? '승인' : '거절';
        const confirmMessage = `예약 ID ${args.booking_id}를 ${statusText}하시겠습니까?\n\n${statusText}하려면 "${statusText}" 버튼을 눌러주세요.`;

        // AI 응답 저장
        await saveMessage(DB, session.id, effectiveTeacherId, 'assistant', confirmMessage);

        return new Response(JSON.stringify({
          success: true,
          sessionKey: session.session_key,
          reply: confirmMessage,
          approvalRequest: {
            booking_id: args.booking_id,
            status: args.status
          },
          messageCount: history.length + 2
        }), { headers: { 'Content-Type': 'application/json' } });
      }
    }

    // 일반 응답 저장
    await saveMessage(DB, session.id, effectiveTeacherId, 'assistant', result.reply);

    return new Response(JSON.stringify({
      success: true,
      sessionKey: session.session_key,
      reply: result.reply,
      messageCount: history.length + 2  // 기존 히스토리 + user + assistant
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Chatbot error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

/**
 * GET /api/chatbot?sessionKey={key} - 대화 히스토리 조회
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;

  try {
    const url = new URL(context.request.url);
    const sessionKey = url.searchParams.get('sessionKey');

    if (!sessionKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'sessionKey parameter is required'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 세션 조회
    const session = await DB.prepare(`
      SELECT id, teacher_id, started_at, message_count
      FROM chat_sessions
      WHERE session_key = ?
    `).bind(sessionKey).first<{ id: number; teacher_id: number; started_at: string; message_count: number }>();

    if (!session) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Session not found'
      }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // 대화 히스토리 조회
    const history = await getChatHistory(DB, session.id, 50);

    return new Response(JSON.stringify({
      success: true,
      session: {
        teacherId: session.teacher_id,
        startedAt: session.started_at,
        messageCount: session.message_count
      },
      messages: history
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Get chat history error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
