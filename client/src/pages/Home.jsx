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

  useEffect(() => {
    setLoadingProps(true);
    api.get('/properties')
      .then(res => {
        setProperties(res.data);
        setLoadingProps(false);
      })
      .catch(err => {
        console.error('Failed to fetch properties:', err);
        setFetchError('Could not load facilities. Is the server running on port 8000?');
        setLoadingProps(false);
      });
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="bg-primary-50 py-20 lg:py-32 border-b border-primary-100">
        <PageWrapper className="text-center">
          <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 tracking-tight mb-6">
            Book top sports venues <span className="text-primary-600">Instantly</span>.
          </h1>
          <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto mb-10">
            Sportek connects you with premium sports facilities. Secure your slot with our 120-second dynamic lock, or join public events and tournaments.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/venues">
              <Button size="lg" className="w-full sm:w-auto">Browser Venues</Button>
            </Link>
            <Link to={isAuthenticated ? '/dashboard/apply-owner' : '/register'}>
              <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white">Become a Partner</Button>
            </Link>
          </div>
        </PageWrapper>
      </section>

      {/* Facilities Grid View */}
      <section className="py-20 bg-white">
        <PageWrapper>
          <h2 className="text-3xl font-bold mb-10 text-slate-900 border-b pb-4">Top Sports Facilities</h2>
          {loadingProps ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : fetchError ? (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
              ⚠ {fetchError}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
               {properties.map(p => (
                 <Link to={`/facilities/${p._id}`} key={p._id} className="group cursor-pointer">
                   <div className="rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all flex flex-col h-full bg-white">
                     <div className="h-48 bg-slate-100 relative">
                       {p.images && p.images[0] ? (
                         <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                       ) : (
                         <div className="absolute inset-0 flex items-center justify-center text-slate-400">No Image</div>
                       )}
                     </div>
                     <div className="p-5 flex-1 flex flex-col">
                       <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary-600 transition-colors mb-1">{p.name}</h3>
                       <p className="text-slate-500 text-sm flex-1">{p.location?.address}</p>
                       <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-100">
                         <span className="font-bold text-xl text-primary-600">${p.pricePerHour} <span className="text-sm font-medium text-slate-500">/ hr</span></span>
                         <span className="text-sm text-yellow-500 font-bold flex items-center gap-1">★ {p.averageRating > 0 ? p.averageRating.toFixed(1) : 'New'}</span>
                       </div>
                     </div>
                   </div>
                 </Link>
               ))}
               {properties.length === 0 && (
                 <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                   <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mb-6">
                     <svg className="w-10 h-10 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                     </svg>
                   </div>
                   <h3 className="text-xl font-bold text-slate-800 mb-2">No facilities listed yet</h3>
                   <p className="text-slate-500 text-sm max-w-sm">
                     Sports facilities will appear here once property owners list them. Check back soon!
                   </p>
                 </div>
               )}
            </div>
          )}
        </PageWrapper>
      </section>

      {/* Feature Section */}
      <section className="py-20 bg-slate-50 border-t border-slate-200">
        <PageWrapper>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center mb-4">
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Real-Time Booking Lock</h3>
              <p className="text-slate-600">Select a time slot and it locks for 120 seconds while you complete payment, ensuring zero double-bookings.</p>
            </div>
            
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center mb-4">
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Live Event Ticketing</h3>
              <p className="text-slate-600">Buy Gold, Silver, or Bronze tier tickets for tournaments. Receive QR Codes instantly for easy stadium entry.</p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center mb-4">
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Asset Bundling</h3>
              <p className="text-slate-600">Rent a venue and add on basketballs, tennis rackets, and bibs all in a single click using our smart bundled packages.</p>
            </div>
          </div>
        </PageWrapper>
      </section>
    </div>
  );
}

export default Home;
