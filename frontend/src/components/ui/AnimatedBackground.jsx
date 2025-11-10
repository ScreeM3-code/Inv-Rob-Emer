export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base neutre */}
      <div className="absolute inset-0 bg-slate-50 dark:bg-slate-950 transition-colors duration-500" />

      <div className="absolute top-[-100px] right-[-100px] w-[600px] h-[600px] bg-gradient-radial from-red-500/40 via-red-700/10 to-transparent dark:from-red-900/40 blur-3xl animate-float-slow" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[600px] h-[600px] bg-gradient-radial from-sky-400/40 via-sky-600/10 to-transparent dark:from-sky-900/40 blur-3xl animate-float-slow [animation-delay:4s]" />
</div>
  );
}
