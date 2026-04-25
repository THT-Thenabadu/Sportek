import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/axios';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { MapPin, Star, DollarSign, Clock } from 'lucide-react';

function Venues() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/properties')
      .then(res => {
        setProperties(res.data.filter(p => p.isActive)); // only show active venues
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center"><LoadingSpinner className="w-12 h-12" /></div>;
  }

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Our Venues</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Browse our top-rated sports facilities and book your next game today.
          </p>
        </div>

        {properties.length === 0 ? (
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {properties.map(p => (
              <Card key={p._id} className="overflow-hidden hover:shadow-xl transition-shadow group flex flex-col">
                <div className="relative h-56 overflow-hidden bg-slate-200">
                  <img
                    src={p.images?.[0] || 'https://via.placeholder.com/600x400?text=No+Image'}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold text-primary-700 shadow-sm">
                    {p.sportType}
                  </div>
                </div>

                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold text-slate-900 line-clamp-1">{p.name}</h3>
                    <div className="flex items-center text-amber-500 shrink-0">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="ml-1 text-sm font-medium text-slate-700">4.8</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-6 text-sm text-slate-600 flex-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{p.location?.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{p.availableHours?.start} - {p.availableHours?.end}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-900 font-medium pt-2">
                      <DollarSign className="w-4 h-4 text-primary-500 shrink-0" />
                      <span>${p.pricePerHour} / hour</span>
                    </div>
                  </div>

                  <Link to={`/facilities/${p._id}`} className="mt-auto">
                    <Button className="w-full">View and Book</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Venues;
