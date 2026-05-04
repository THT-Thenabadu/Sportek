import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../lib/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function OwnerRescheduleRequestsScreen() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchRequests = useCallback(async () => {
        try {
            const res = await api.get('/reschedule/owner');
            setRequests(res.data || []);
        } catch (e) {
            console.log('Error fetching owner requests:', e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    const handleAction = async (requestId, action) => {
        try {
            // action is either 'approve' or 'decline'
            await api.patch(`/reschedule/${requestId}/${action}`);
            Alert.alert('Success', `Request has been ${action}d.`);
            fetchRequests(); // Refresh list to reflect changes
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || `Failed to ${action} request.`);
        }
    };

    const onRefresh = () => { setRefreshing(true); fetchRequests(); };

    if (loading) return <LoadingSpinner message="Loading requests..." />;

    return (
        <View style={styles.container}>
            <FlatList
                data={requests}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <View style={[styles.card, item.sameInstitution && styles.institutionHighlight]}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.customerName}>{item.customerId?.name}</Text>
                            {item.sameInstitution && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>Internal: {item.customerId?.institution}</Text>
                                </View>
                            )}
                        </View>

                        <Text style={styles.infoText}>Venue: {item.propertyId?.name}</Text>
                        <Text style={styles.infoText}>Requested: {item.requestedDate ? item.requestedDate.split('T')[0] : 'Open-ended (Use web to select slot)'}</Text>
                        <Text style={styles.infoText}>Time: {item.requestedTimeSlot ? `${item.requestedTimeSlot.start} - ${item.requestedTimeSlot.end}` : 'Any'}</Text>

                        {item.customerMessage ? (
                            <Text style={styles.message}> {item.customerMessage} </Text>
                        ) : null}

                        {item.requestedDate && !item.isSlotAvailable && (
                            <Text style={styles.errorText}>⚠️ This slot is already booked by someone else.</Text>
                        )}

                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[styles.btn, styles.approveBtn, (!item.isSlotAvailable || !item.requestedDate) && styles.disabledBtn]}
                                onPress={() => handleAction(item._id, 'approve')}
                                disabled={!item.isSlotAvailable || !item.requestedDate}
                            >
                                <Text style={styles.btnText}>Approve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.btn, styles.declineBtn]}
                                onPress={() => handleAction(item._id, 'decline')}
                            >
                                <Text style={styles.btnText}>Decline</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="mail-outline" size={48} color="#cbd5e1" />
                        <Text style={styles.emptyText}>No pending change requests</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    institutionHighlight: { borderColor: '#1d4ed8', borderLeftWidth: 4 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    customerName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
    badge: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    badgeText: { fontSize: 10, color: '#1d4ed8', fontWeight: '600' },
    infoText: { fontSize: 14, color: '#64748b', marginBottom: 2 },
    message: { fontSize: 13, color: '#475569', fontStyle: 'italic', marginVertical: 8, padding: 8, backgroundColor: '#f1f5f9', borderRadius: 6 },
    errorText: { color: '#dc2626', fontSize: 12, marginTop: 8, fontWeight: '600' },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
    btn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    approveBtn: { backgroundColor: '#1d4ed8' },
    declineBtn: { backgroundColor: '#ef4444' },
    disabledBtn: { backgroundColor: '#94a3b8' },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: '#94a3b8', marginTop: 12 }
});