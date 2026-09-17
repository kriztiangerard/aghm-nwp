function SplashPage() {
  return (
    <main className="min-h-screen bg-black flex items-center px-8 sm:px-12 lg:px-20">
      <section className="w-full max-w-2xl">
        <h1 className="text-6xl font-bold text-emerald-400 sm:text-7xl">
          Hello!
        </h1>

        <p className="mt-8 max-w-xl text-base leading-relaxed text-white sm:text-lg">
          The Network Planner is an intelligent, automated network infrastructure
          planning tool designed to take the guesswork out of network
          deployment for small and medium-sized businesses. By translating
          structural requirements into vendor-specific hardware
          recommendations, the platform generates comprehensive bills of
          materials and interactive logical network topologies.
        </p>

        <div className="mt-8">
          <button
            type="button"
            className="rounded-full bg-purple-600 px-10 py-3 font-medium text-white"
          >
            Start
          </button>
        </div>
      </section>
    </main>
  );
}

export default SplashPage;