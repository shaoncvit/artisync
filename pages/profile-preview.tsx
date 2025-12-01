import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { firebase } from "@/lib/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

type ArtistProfile = {
  fullName: string;
  profilePictureUrl: string;
  coverBannerUrl: string;
  city: string;
  country: string;
  area: string;
  youtubeVideo: string;
  phone: string;
  email: string;
  instagram: string;
  facebook: string;
  youtube: string;
  bio: string;
  createdAt: any;
};

export default function ProfilePreviewPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(firebase.auth, async (u) => {
      if (!u) {
        router.replace({ pathname: "/signup", query: { role: "artist" } });
      } else {
        setUserId(u.uid);
        try {
          // Fetch profile data from Firestore
          const profileDoc = await getDoc(doc(firebase.db, "artists", u.uid));
          if (profileDoc.exists()) {
            setProfile(profileDoc.data() as ArtistProfile);
          } else {
            setError("Profile not found. Please create and save your profile first.");
          }
        } catch (err: any) {
          setError(err?.message ?? "Failed to load profile");
        } finally {
          setLoading(false);
        }
      }
    });
    return () => unsub();
  }, [router]);

  // Extract YouTube video ID from URL
  function getYouTubeVideoId(url: string): string | null {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  const videoId = profile?.youtubeVideo ? getYouTubeVideoId(profile.youtubeVideo) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 font-semibold text-lg mb-2">Profile Not Found</p>
          <p className="text-gray-500 mb-4">{error || "You need to create and save your profile first"}</p>
          <button
            onClick={() => router.push("/create-profile")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Create Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <img 
                src="/logo_2.png" 
                alt="ArtInYou Logo" 
                className="h-12 w-auto object-contain"
              />
            </div>
            
            {/* Navigation */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/create-profile")}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Success Banner */}
          <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-800 font-medium">Profile loaded successfully from database</span>
            </div>
          </div>
          
          {/* Profile Header Section */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            {/* Cover Photo */}
            <div className="relative h-64 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
              {profile?.coverBannerUrl ? (
                <img
                  src={profile.coverBannerUrl}
                  alt="Cover Banner"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
                    <div className="absolute bottom-20 right-20 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                    <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-white/10 rounded-full blur-lg"></div>
                  </div>
                  <div className="text-center text-white relative z-10">
                    <svg className="w-20 h-20 mx-auto mb-4 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xl font-semibold opacity-95 mb-2">No cover photo</p>
                    <p className="text-sm opacity-80">Add a cover photo to make your profile stand out</p>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Info Section */}
            <div className="px-10 pb-10">
              <div className="flex flex-col items-center -mt-24 mb-8">
                {/* Profile Picture */}
                <div className="relative mb-8">
                  <div className="w-48 h-48 rounded-full border-8 border-white bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden shadow-2xl">
                    {profile?.profilePictureUrl ? (
                      <img
                        src={profile.profilePictureUrl}
                        alt="Profile Picture"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* Basic Info - Centered below profile picture */}
                <div className="text-center mb-8 w-full max-w-2xl">
                  <div className="mb-6">
                    <h1 className="text-4xl font-bold text-gray-900">
                      {profile.fullName || "Your Name"}
                    </h1>
                  </div>
                  
                  {/* Short Bio */}
                  {profile.bio && (
                    <div className="mb-8">
                      <p className="text-lg text-gray-700 leading-relaxed max-w-2xl mx-auto">
                        {profile.bio}
                      </p>
                    </div>
                  )}
                  
                  {/* Location and Contact - Side by side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Location Info */}
                    {(profile.city || profile.country || profile.area) && (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
                        <div className="flex items-center justify-center mb-4">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <span className="text-blue-700 font-semibold text-lg">Location</span>
                        </div>
                        
                        <div className="space-y-2 text-center">
                          {profile.area && profile.city && (
                            <p className="text-gray-700 font-medium">{profile.area} {profile.city}</p>
                          )}
                          {profile.country && <p className="text-gray-600">{profile.country}</p>}
                        </div>
                      </div>
                    )}

                    {/* Contact Details */}
                    {(profile.phone || profile.email || profile.instagram || profile.facebook || profile.youtube) && (
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100 shadow-sm">
                        <div className="flex items-center justify-center mb-4">
                          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </div>
                          <span className="text-green-700 font-semibold text-lg">Contact Details</span>
                        </div>
                        
                        <div className="space-y-3 text-center">
                          {profile.phone && (
                            <div className="flex items-center justify-center space-x-2">
                              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span className="text-gray-700">{profile.phone}</span>
                            </div>
                          )}
                          
                          {profile.email && (
                            <div className="flex items-center justify-center space-x-2">
                              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="text-gray-700">{profile.email}</span>
                            </div>
                          )}

                          {/* Social Media Links */}
                          {(profile.instagram || profile.facebook || profile.youtube) && (
                            <div className="pt-3 border-t border-green-200">
                              <p className="text-sm text-green-600 font-medium mb-2">Social Media</p>
                              <div className="flex justify-center space-x-3">
                                {profile.instagram && (
                                  <a
                                    href={profile.instagram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200"
                                  >
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                    </svg>
                                  </a>
                                )}
                                
                                {profile.facebook && (
                                  <a
                                    href={profile.facebook}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200"
                                  >
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                    </svg>
                                  </a>
                                )}
                                
                                {profile.youtube && (
                                  <a
                                    href={profile.youtube}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200"
                                  >
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                    </svg>
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* YouTube Video Section */}
          {profile.youtubeVideo && (
            <div className="mt-8 bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">YouTube Video</h3>
                  <p className="text-gray-600 text-base">Showcase your talent</p>
                </div>
              </div>
              
              <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden shadow-lg border border-gray-200">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
