import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import PageWrapper from '../components/ui/PageWrapper';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import useAuthStore from '../store/useAuthStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';

function timeAgo(dateParam) {
  const diff = Math.floor((new Date() - new Date(dateParam)) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 2592000) {
    const days = Math.floor(diff / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  const months = Math.floor(diff / 2592000);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

function FacilityReviews({ propertyId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/reviews/property/${propertyId}`)
      .then(res => setReviews(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) return <div className="py-4"><LoadingSpinner className="w-6 h-6" /></div>;

  const displayStars = (rating) => {
    return Array(5).fill(0).map((_, i) => (
      <svg key={i} className={`w-4 h-4 shrink-0 ${i < Math.round(rating) ? 'text-yellow-400 fill-current' : 'text-slate-200 fill-current'}`} viewBox="0 0 20 20">
         <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  const total = reviews.length;
  if (!total) {
    return <p className="text-slate-500 italic bg-slate-50 p-6 rounded-xl border border-slate-100 text-center">No reviews yet — book this facility to leave a review!</p>;
  }

  const avg = (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 bg-yellow-50 text-yellow-800 p-4 rounded-xl border border-yellow-200 w-fit">
         <div className="flex">{displayStars(avg)}</div>
         <span className="font-bold whitespace-nowrap">★ {avg} out of 5</span>
         <span className="text-slate-500 text-sm whitespace-nowrap">— {total} review{total !== 1 && 's'}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reviews.map(r => (
          <Card key={r._id} className="p-5 shadow-sm bg-white h-full hover:shadow-md transition-shadow border-slate-200">
             <div className="flex justify-between items-start mb-3">
               <div>
                  <p className="font-bold text-slate-800">{r.customerId?.name?.split(' ')[0] || 'User'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{timeAgo(r.createdAt)}</p>
               </div>
               <div className="flex">{displayStars(r.rating)}</div>
             </div>
             {r.comment && <p className="text-sm text-slate-600 italic">"{r.comment}"</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}

function FacilityDetails() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleBookClick = () => {
    if (!user) {
      navigate('/login', { state: { from: `/facilities/${id}/book` } });
      return;
    }
    navigate(`/facilities/${id}/book`);
  };

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const propRes = await api.get(`/properties/${id}`);
        setProperty(propRes.data);
        setAssets(propRes.data.bundledAssets || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) return <div className="flex justify-center p-20"><LoadingSpinner className="w-12 h-12" /></div>;
  if (!property) return <div className="text-center p-20">Facility not found</div>;

  return (
    <PageWrapper>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Col */}
        <div className="md:col-span-2 space-y-8">
          <div className="bg-slate-200 rounded-xl h-96 flex items-center justify-center text-slate-500 overflow-hidden">
             {property.images && property.images[0] ? (
               <img src={property.images[0]} alt={property.name} className="w-full h-full object-cover" />
             ) : (
               <span>No Image Available</span>
             )}
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900">{property.name}</h1>
            <p className="text-slate-500 flex items-center gap-2 mt-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {property.location?.address}
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-4">About this facility</h2>
            <p className="text-slate-700 whitespace-pre-wrap">{property.description}</p>
          </div>
          {assets.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Assets & Equipment</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {assets.map(a => (
                  <Card key={a._id} className="p-4 flex gap-4 items-center">
                    {a.image ? (
                      <img src={a.image} alt={a.name} className="w-20 h-20 object-cover rounded-lg bg-slate-100 shrink-0 border border-slate-200" />
                    ) : (
                      <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs shrink-0 border border-slate-200">
                        No Img
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-slate-800">{a.name}</span>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-full whitespace-nowrap">
                          Qty: {a.quantity}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2" title={a.description}>{a.description || a.assetType}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {/* Reviews Block */}
          <div className="pt-8 border-t border-slate-200">
            <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
            <FacilityReviews propertyId={id} />
          </div>
        </div>

        {/* Right Col */}
        <div>
          <Card className="sticky top-24">
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-end">
                 <span className="text-3xl font-bold text-primary-600">${property.pricePerHour}</span>
                 <span className="text-slate-500">/ hour</span>
              </div>
              <div className="flex items-center gap-2 text-yellow-500">
                 <svg className="w-6 h-6 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                 <span className="font-bold text-slate-700">4.8</span>
                 <span className="text-slate-500 underline">(124 reviews)</span>
              </div>
              {user && (user.role === 'propertyOwner' || user.role === 'securityOfficer') ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 text-center font-medium">
                  Property owners and security officers cannot make bookings
                </div>
              ) : (
                <Button 
                  size="lg" 
                  className="w-full text-lg shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5"
                  onClick={handleBookClick}
                >
                  Book Now
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}

export default FacilityDetails;
