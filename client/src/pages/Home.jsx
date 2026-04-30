import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import api from '../lib/axios';
import PageWrapper from '../components/ui/PageWrapper';
import Button from '../components/ui/Button';

function Home() {
  const { isAuthenticated } = useAuthStore();
  const [properties, setProperties] = useState([]);
  const [loadingProps, setLoadingProps] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [typewriterText, setTypewriterText] = useState('');
  const [favorites, setFavorites] = useState(new Set());

  const fullText = 'Book in 120 seconds. Play in minutes.';

  // Typewriter effect
  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setTypewriterText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Fetch properties
  useEffect(() => {
    setLoadingProps(true);
    api.get('/properties')
      .then(res => {
        setProperties(res.data);
        setLoadingProps(false);
      })
      .catch(err => {
        console.error('Failed to fetch properties:', err);
        setFetchError('Could not load facilities. Is the server running on port 5000?');
        setLoadingProps(false);
      });
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in-up');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.observe-fade').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [loadingProps]);

  const toggleFavorite = (id) => {
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section - Clean Centered Layout */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20 lg:py-32">
        {/* Simple Clean Gradient Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-900/20 via-transparent to-transparent"></div>
        
        <PageWrapper className="relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tight mb-6 leading-tight">
              Book top sports venues{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 bg-clip-text text-transparent animate-gradient">
                  instantly
                </span>
              </span>
            </h1>

            {/* Typewriter Sub-headline */}
            <p className="text-xl md:text-2xl text-slate-300 mb-12 h-8 font-medium">
              {typewriterText}
              <span className="animate-pulse">|</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-5 mb-8">
              <Link to="/venues">
                <Button size="lg" className="w-full sm:w-auto px-12 py-6 text-lg font-bold bg-white text-slate-900 hover:bg-slate-100 shadow-2xl hover:scale-105 transition-all duration-300">
                  Browse Venues
                  <svg className="w-6 h-6 ml-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Button>
              </Link>
              <Link to={isAuthenticated ? '/dashboard/apply-owner' : '/register'}>
                <Button size="lg" className="w-full sm:w-auto px-12 py-6 text-lg font-bold bg-transparent text-white border-2 border-white hover:bg-white hover:text-slate-900 shadow-2xl hover:scale-105 transition-all duration-300">
                  Become a Partner
                  <svg className="w-6 h-6 ml-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Button>
              </Link>
            </div>
          </div>
        </PageWrapper>
      </section>

      {/* Social Proof Bar */}
      <section className="border-y border-slate-200 bg-white py-8">
        <PageWrapper>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 text-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-2xl font-black text-slate-900">2,400+</div>
                <div className="text-sm text-slate-600">Venues</div>
              </div>
            </div>

            <div className="hidden md:block w-px h-12 bg-slate-200"></div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-2xl font-black text-slate-900">50,000+</div>
                <div className="text-sm text-slate-600">Bookings</div>
              </div>
            </div>

            <div className="hidden md:block w-px h-12 bg-slate-200"></div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-2xl font-black text-slate-900">4.9★</div>
                <div className="text-sm text-slate-600">Average Rating</div>
              </div>
            </div>
          </div>
        </PageWrapper>
      </section>

      {/* Venue Cards Grid */}
      <section id="venues-section" className="py-20 bg-slate-50">
        <PageWrapper>
          <div className="observe-fade opacity-0 mb-12">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-3">
              Featured Venues
            </h2>
            <p className="text-lg text-slate-600">
              {properties.length} venue{properties.length !== 1 ? 's' : ''} available
            </p>
          </div>

          {loadingProps ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-slate-200 rounded-2xl h-64 mb-3"></div>
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : fetchError ? (
            <div className="max-w-md mx-auto p-6 bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-bold text-lg mb-1">Connection Error</h3>
                  <p className="text-sm">{fetchError}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {properties.map((p, index) => (
                <div
                  key={p._id}
                  className="observe-fade opacity-0 group cursor-pointer"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Link to={`/facilities/${p._id}`} className="block">
                    {/* Image Container - Full Bleed */}
                    <div className="relative rounded-2xl overflow-hidden mb-3 aspect-[4/3]">
                      {p.images && p.images[0] ? (
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                          <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}

                      {/* Favorite Heart Icon */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFavorite(p._id);
                        }}
                        className="absolute top-3 left-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                      >
                        <svg
                          className={`w-5 h-5 ${favorites.has(p._id) ? 'fill-red-500 text-red-500' : 'text-slate-700'}`}
                          fill={favorites.has(p._id) ? 'currentColor' : 'none'}
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>

                      {/* Quick Book Overlay on Hover */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="px-6 py-3 bg-white rounded-full font-bold text-slate-900 shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                          Quick Book
                        </div>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="space-y-2">
                      {/* Location */}
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">{p.location?.address || 'Location not specified'}</span>
                      </div>

                      {/* Venue Name */}
                      <h3 className="font-bold text-slate-900 text-lg truncate group-hover:text-primary-600 transition-colors">
                        {p.name}
                      </h3>

                      {/* Sport Type Tags */}
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">
                          {p.sportType || 'Multi-sport'}
                        </span>
                        {p.averageRating > 0 && (
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold flex items-center gap-1">
                            <svg className="w-3 h-3 text-yellow-500 fill-current" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {p.averageRating.toFixed(1)}
                          </span>
                        )}
                      </div>

                      {/* Price */}
                      <div className="pt-2">
                        <span className="text-2xl font-black text-slate-900">${p.pricePerHour}</span>
                        <span className="text-slate-600 text-sm font-medium"> / hour</span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}

              {properties.length === 0 && !loadingProps && (
                <div className="col-span-full py-20 text-center">
                  <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">No venues found</h3>
                  <p className="text-slate-600">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          )}
        </PageWrapper>
      </section>


      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <PageWrapper>
          <div className="observe-fade opacity-0 text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Book your perfect sports venue in three simple steps
            </p>
          </div>

          <div className="observe-fade opacity-0 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 relative">
              {/* Connecting Lines - Desktop Only */}
              <div className="hidden md:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-200 via-primary-300 to-primary-200 -z-10"></div>

              {/* Step 1 */}
              <div className="text-center relative">
                <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-xl relative">
                  <span className="text-5xl font-black text-white">1</span>
                  <div className="absolute inset-0 rounded-full bg-primary-400 animate-ping opacity-20"></div>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3">Find a Venue</h3>
                <p className="text-slate-600 leading-relaxed">
                  Search by location, sport type, or browse our curated list of premium facilities
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center relative">
                <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-xl relative">
                  <span className="text-5xl font-black text-white">2</span>
                  <div className="absolute inset-0 rounded-full bg-primary-400 animate-ping opacity-20" style={{ animationDelay: '0.5s' }}></div>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3">Lock Your Slot</h3>
                <p className="text-slate-600 leading-relaxed">
                  Select your time and we'll hold it for 120 seconds while you complete payment
                </p>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-full text-sm font-bold">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  120s Timer
                </div>
              </div>

              {/* Step 3 */}
              <div className="text-center relative">
                <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-xl relative">
                  <span className="text-5xl font-black text-white">3</span>
                  <div className="absolute inset-0 rounded-full bg-primary-400 animate-ping opacity-20" style={{ animationDelay: '1s' }}></div>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3">Play</h3>
                <p className="text-slate-600 leading-relaxed">
                  Get instant confirmation and show up ready to play. It's that simple!
                </p>
              </div>
            </div>
          </div>
        </PageWrapper>
      </section>

      {/* Features Section - Alternating Layout */}
      <section className="py-20 bg-slate-50">
        <PageWrapper>
          <div className="observe-fade opacity-0 text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
              Why Choose Sportek?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Built for athletes, by athletes. Experience the future of sports venue booking.
            </p>
          </div>

          {/* Feature 1 - Image Left */}
          <div className="observe-fade opacity-0 grid md:grid-cols-2 gap-12 lg:gap-20 items-center mb-32">
            <div className="order-2 md:order-1">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
                Real-Time Booking Lock
              </h3>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                Our innovative 120-second lock system ensures zero double-bookings. When you select a time slot, it's exclusively yours while you complete the payment process. No more frustrating booking conflicts.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-700">Exclusive 120-second hold on your selected slot</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-700">Real-time availability updates</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-700">Instant confirmation upon payment</span>
                </li>
              </ul>
            </div>
            <div className="order-1 md:order-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl transform rotate-3"></div>
                <div className="relative bg-white rounded-3xl shadow-2xl p-8 transform -rotate-1 hover:rotate-0 transition-transform duration-500">
                  <div className="aspect-square bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center">
                    <svg className="w-32 h-32 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 - Image Right */}
          <div className="observe-fade opacity-0 grid md:grid-cols-2 gap-12 lg:gap-20 items-center mb-32">
            <div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-purple-600 rounded-3xl transform -rotate-3"></div>
                <div className="relative bg-white rounded-3xl shadow-2xl p-8 transform rotate-1 hover:rotate-0 transition-transform duration-500">
                  <div className="aspect-square bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl flex items-center justify-center">
                    <svg className="w-32 h-32 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
                Live Event Ticketing
              </h3>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                Join tournaments and public events with our tiered ticketing system. Choose from Gold, Silver, or Bronze tiers and receive instant QR codes for seamless stadium entry.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-700">Gold, Silver, and Bronze tier options</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-700">Instant QR code generation</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-700">Mobile-friendly digital tickets</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Feature 3 - Image Left */}
          <div className="observe-fade opacity-0 grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 md:order-1">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
                Smart Asset Bundling
              </h3>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                Need equipment? Add basketballs, tennis rackets, bibs, and more to your booking with a single click. Our smart bundling system makes it easy to get everything you need.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-700">Pre-configured equipment packages</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-700">One-click add-ons during booking</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-700">Quality equipment guaranteed</span>
                </li>
              </ul>
            </div>
            <div className="order-1 md:order-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 rounded-3xl transform rotate-3"></div>
                <div className="relative bg-white rounded-3xl shadow-2xl p-8 transform -rotate-1 hover:rotate-0 transition-transform duration-500">
                  <div className="aspect-square bg-gradient-to-br from-green-50 to-green-100 rounded-2xl flex items-center justify-center">
                    <svg className="w-32 h-32 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PageWrapper>
      </section>

      {/* Footer CTA Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 py-20">
        {/* SVG Pattern Background */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="sports-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-white" />
                <circle cx="75" cy="75" r="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-white" />
                <path d="M25 25 L75 75" stroke="currentColor" strokeWidth="2" className="text-white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#sports-pattern)" />
          </svg>
        </div>

        <PageWrapper className="relative z-10 text-center">
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6">
            Ready to book your next game?
          </h2>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Join thousands of athletes who trust Sportek for their sports venue bookings
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/venues">
              <Button size="lg" className="w-full sm:w-auto px-12 py-6 text-lg font-bold bg-white text-slate-900 hover:bg-slate-100 shadow-2xl hover:scale-105 transition-all duration-300">
                Find a Venue
                <svg className="w-6 h-6 ml-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>
            </Link>
            <Link to={isAuthenticated ? '/dashboard/apply-owner' : '/register'}>
              <Button size="lg" className="w-full sm:w-auto px-12 py-6 text-lg font-bold bg-transparent text-white border-2 border-white hover:bg-white hover:text-slate-900 shadow-2xl hover:scale-105 transition-all duration-300">
                Become a Partner
                <svg className="w-6 h-6 ml-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Button>
            </Link>
          </div>
        </PageWrapper>
      </section>

      {/* For Venue Owners Section */}
      <section className="py-20 bg-white border-t border-slate-200">
        <PageWrapper>
          <div className="observe-fade opacity-0 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-3xl p-8 md:p-12 text-center">
              <div className="w-20 h-20 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
                Own a Sports Venue?
              </h3>
              <p className="text-lg text-slate-700 mb-8 max-w-2xl mx-auto">
                List your facility on Sportek and reach thousands of athletes looking for quality venues. Manage bookings, track revenue, and grow your business with our powerful platform.
              </p>
              <div className="flex flex-wrap justify-center gap-6 mb-8">
                <div className="flex items-center gap-2 text-slate-700">
                  <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold">Zero listing fees</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold">Automated booking management</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold">Real-time analytics</span>
                </div>
              </div>
              <Link to={isAuthenticated ? '/dashboard/apply-owner' : '/register'}>
                <Button size="lg" className="px-10 py-5 text-lg font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-xl hover:scale-105 transition-all duration-300">
                  Become a Partner Today
                  <svg className="w-5 h-5 ml-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Button>
              </Link>
            </div>
          </div>
        </PageWrapper>
      </section>
    </div>
  );
}

export default Home;
