export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black/40 backdrop-blur-xl py-12">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-3xl font-bold tracking-tighter bg-gradient-to-r from-orange-400 via-yellow-500 to-orange-600 bg-clip-text text-transparent drop-shadow-lg">
          PackSapeka<span className="text-white">.</span>
        </div>
        <p className="text-sm text-white/50">
          © {new Date().getFullYear()} Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
