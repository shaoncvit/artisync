import type { NextPage } from "next";
import Link from "next/link";

const Home: NextPage = () => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted={true}
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/background-video.mp4" type="video/mp4" />
        {/* Fallback for browsers that don't support video */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900" />
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Header with Logo */}
      <header className="relative z-10 p-4">
        <div className="flex items-center">
          <img 
            src="/logo.png" 
            alt="ArtInYou Logo" 
            className="h-32 w-32 object-contain"
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen items-start justify-center px-6 pt-20">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-8 shadow-2xl">
            <h1 className="text-2xl font-semibold text-white text-center">Welcome to ArtInYou</h1>
            <p className="mt-2 text-sm text-white/80 text-center">Choose how you want to continue</p>

            <div className="mt-6 grid gap-4">
              <Link
                href={{ pathname: "/signup", query: { role: "artist" } }}
                className="w-full inline-flex items-center justify-center rounded-xl bg-white px-4 py-3 text-gray-900 hover:bg-gray-100 focus:outline-none font-medium transition-all duration-200"
              >
                I am an Artist
              </Link>

              <Link
                href={{ pathname: "/signup", query: { role: "client" } }}
                className="w-full inline-flex items-center justify-center rounded-xl bg-white/10 border border-white/30 px-4 py-3 text-white hover:bg-white/20 focus:outline-none font-medium transition-all duration-200"
              >
                I am a Client
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mute Button */}
      <button
        onClick={() => {
          const video = document.querySelector('video');
          if (video) {
            video.muted = !video.muted;
          }
        }}
        className="fixed bottom-6 left-6 z-20 rounded-full bg-white/20 backdrop-blur-sm p-3 text-white hover:bg-white/30 transition-all duration-200"
        title="Toggle sound"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M6.343 6.343a1 1 0 011.414 0l8.486 8.486a1 1 0 01-1.414 1.414L6.343 7.757a1 1 0 010-1.414z" />
        </svg>
      </button>
    </div>
  );
};

export default Home;
