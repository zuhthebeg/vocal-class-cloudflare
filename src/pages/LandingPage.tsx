import { Link } from 'react-router'
import {
  Music,
  Calendar,
  Users,
  Mic,
  Star,
  Clock,
  ArrowRight,
  CheckCircle,
} from 'lucide-react'

const categories = [
  { icon: Mic, name: '팝 보컬', count: 12 },
  { icon: Music, name: '클래식 성악', count: 8 },
  { icon: Music, name: '뮤지컬', count: 6 },
  { icon: Music, name: 'K-POP', count: 15 },
  { icon: Music, name: '재즈', count: 4 },
  { icon: Music, name: 'R&B', count: 7 },
]

const features = [
  {
    icon: Calendar,
    title: '간편한 예약',
    desc: '원하는 시간에 바로 예약. 강사 스케줄을 실시간으로 확인하세요.',
  },
  {
    icon: Users,
    title: '맞춤 1:1 레슨',
    desc: '학생 레벨에 맞는 커리큘럼으로 체계적인 수업을 진행합니다.',
  },
  {
    icon: Clock,
    title: '유연한 일정',
    desc: '바쁜 일상 속에서도 원하는 시간에 레슨을 받으세요.',
  },
]

export function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 py-20 sm:py-28 lg:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              당신의 목소리,
              <br />
              <span className="text-indigo-200">더 멀리 울려 퍼지게</span>
            </h1>
            <p className="text-lg sm:text-xl text-indigo-100 mb-10 max-w-2xl mx-auto">
              전문 보컬 강사와 함께하는 맞춤형 1:1 레슨.
              <br className="hidden sm:block" />
              원하는 시간에 예약하고 실력을 키워보세요.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold bg-white text-indigo-700 rounded-xl hover:bg-indigo-50 transition-colors shadow-lg shadow-indigo-900/20"
              >
                수업 시작하기
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold bg-indigo-500/30 text-white rounded-xl hover:bg-indigo-500/40 transition-colors backdrop-blur-sm"
              >
                강사로 등록하기
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="relative border-t border-indigo-500/30 bg-indigo-800/30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: '50+', label: '전문 강사' },
                { value: '1,200+', label: '등록 수강생' },
                { value: '15,000+', label: '완료된 레슨' },
                { value: '4.9', label: '평균 평점', icon: Star },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="flex items-center justify-center gap-1 text-2xl sm:text-3xl font-bold text-white">
                    {stat.value}
                    {stat.icon && <stat.icon className="w-5 h-5 text-yellow-400 fill-yellow-400" />}
                  </div>
                  <div className="text-sm text-indigo-200 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
              다양한 장르의 보컬 레슨
            </h2>
            <p className="text-slate-600">
              팝, 클래식, 뮤지컬 등 원하는 장르의 전문 강사를 만나보세요
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.name}
                className="group flex flex-col items-center p-6 bg-slate-50 rounded-xl hover:bg-indigo-50 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-3">
                  <cat.icon className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">
                  {cat.name}
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  {cat.count}명의 강사
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
              왜 보컬클래스인가요?
            </h2>
            <p className="text-slate-600">
              더 나은 레슨 경험을 위한 모든 것
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-xl mb-5">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-slate-600 mb-8">
            무료로 가입하고 첫 레슨을 예약해보세요
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
            >
              무료로 시작하기
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
            {['가입비 없음', '즉시 예약 가능', '언제든 취소 가능'].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-green-500" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-xl font-bold text-white">보컬클래스</div>
            <div className="text-sm">
              © 2026 보컬클래스. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
