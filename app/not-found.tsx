export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-teal-400 mb-4">404</h1>
        <p className="text-xl text-slate-300 mb-8">페이지를 찾을 수 없습니다</p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-medium rounded-lg transition-colors"
        >
          홈으로 돌아가기
        </a>
      </div>
    </div>
  )
}
