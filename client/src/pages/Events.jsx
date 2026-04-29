import React, { useEffect, useState } from 'react';
import api from '../lib/axios';
import PageWrapper from '../components/ui/PageWrapper';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function CheckoutForm({ total, onCancel, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/tickets`,
      },
      redirect: 'if_required' 
    });

    if (error) {
      alert(error.message);
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <div className="flex justify-end gap-3 pt-4 border-t mt-4">
        <Button variant="outline" type="button" onClick={onCancel} disabled={isProcessing}>Cancel</Button>
        <Button type="submit" isLoading={isProcessing}>Pay ${total}</Button>
      </div>
    </form>
  );
}

function Events() {
  const [events, setEvents] = useState([]);
  const [checkoutData, setCheckoutData] = useState(null);

  useEffect(() => {
    api.get('/events').then(res => setEvents(res.data)).catch(console.error);
  }, []);

  const purchaseTicket = async (eventDoc, tierObj) => {
    try {
      const res = await api.post('/tickets/purchase', { eventId: eventDoc._id, tier: tierObj.tier });
      setCheckoutData({
        event: eventDoc,
        tier: tierObj,
        clientSecret: res.data.clientSecret
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Error fetching ticket session. Are you logged in?');
    }
  };

  const handleSuccess = () => {
    alert('Payment successful! Your ticket is in your dashboard.');
    window.location.href = '/dashboard/tickets';
  };

  return (
    <PageWrapper>
      <h1 className="text-4xl font-extrabold text-slate-900 mb-8">Tournaments & Public Events</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {events.map(e => (
          <Card key={e._id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="h-48 bg-primary-100 relative">
               {e.bannerImage ? <img src={e.bannerImage} className="w-full h-full object-cover" alt={e.name || e.title}/> : <div className="flex items-center justify-center h-full text-primary-500 font-medium">No Banner</div>}
               <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                 <h2 className="text-2xl font-bold text-white">{e.name || e.title}</h2>
               </div>
            </div>
            <CardContent className="p-6">
              <p className="text-slate-600 mb-4">{e.description}</p>
              <div className="text-sm font-medium text-slate-500 mb-4 flex justify-between">
                <span>{new Date(e.date).toLocaleDateString()}</span>
                <span>{e.location}</span>
              </div>
              <div className="border-t pt-4 mt-4 space-y-3">
                 <p className="font-bold text-slate-900 pb-2">Ticket Tiers</p>
                 {e.ticketTiers && e.ticketTiers.map(tier => (
                   <div key={tier.tier} className="flex justify-between items-center bg-slate-50 p-2 rounded border">
                     <span className="font-semibold capitalize">{tier.tier}</span>
                     <div className="flex items-center gap-4">
                       <span className="text-primary-600 font-bold">${tier.price}</span>
                       <Button size="sm" onClick={() => purchaseTicket(e, tier)} disabled={tier.soldQuantity >= tier.totalQuantity}>
                         {tier.soldQuantity >= tier.totalQuantity ? 'Sold Out' : 'Buy'}
                       </Button>
                     </div>
                   </div>
                 ))}
                 {(!e.ticketTiers || e.ticketTiers.length === 0) && <p className="text-sm text-slate-400">No tickets available.</p>}
              </div>
            </CardContent>
          </Card>
        ))}
        {events.length === 0 && <p className="text-slate-500">No upcoming events scheduled.</p>}
      </div>

      {checkoutData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <h2 className="text-xl font-bold mb-1">Complete Purchase</h2>
            <p className="text-sm text-slate-500 mb-6">
              1x {checkoutData.tier.tier} Ticket — {checkoutData.event.name || checkoutData.event.title}
            </p>
            {checkoutData.clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret: checkoutData.clientSecret }}>
                <CheckoutForm 
                  clientSecret={checkoutData.clientSecret} 
                  total={checkoutData.tier.price}
                  onCancel={() => setCheckoutData(null)} 
                  onSuccess={handleSuccess} 
                />
              </Elements>
            ) : (
              <div className="py-8 flex justify-center"><LoadingSpinner /></div>
            )}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

export default Events;
