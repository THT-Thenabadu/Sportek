import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, StatusBar, Image, Dimensions, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import api from "../../lib/axios";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SPORT_CATEGORIES = [
  { label: "Football",    icon: "football",        color: "#16a34a", bg: "#dcfce7" },
  { label: "Basketball",  icon: "basketball",      color: "#ea580c", bg: "#ffedd5" },
  { label: "Tennis",      icon: "tennisball",      color: "#ca8a04", bg: "#fef9c3" },
  { label: "Cricket",     icon: "baseball",        color: "#7c3aed", bg: "#ede9fe" },
  { label: "Swimming",    icon: "water",           color: "#0284c7", bg: "#e0f2fe" },
  { label: "Badminton",   icon: "tennisball",      color: "#db2777", bg: "#fce7f3" },
  { label: "Gym",         icon: "barbell",         color: "#dc2626", bg: "#fee2e2" },
  { label: "All",         icon: "grid",            color: "#1d4ed8", bg: "#eff6ff" },
];

const PLACEHOLDER_COLORS = ["#dbeafe","#e0e7ff","#d1fae5","#fef3c7","#ffe4e6"];
const SPORT_ICONS = {
  football:"football", basketball:"basketball", tennis:"tennisball",
  badminton:"tennisball", cricket:"baseball", swimming:"water",
  volleyball:"football", gym:"barbell",
};

function SkeletonCard() {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[styles.skeletonCard, { opacity: anim }]} />
  );
}

function FeaturedCard({ facility, onPress }) {
  const name = facility.name || "Venue";
  const sport = facility.sportType || "Sport";
  const price = facility.pricePerHour;
  const img = facility.images?.[0];
  const colorIndex = (name.charCodeAt(0) || 0) % PLACEHOLDER_COLORS.length;
  const iconName = SPORT_ICONS[sport.toLowerCase()] || "fitness";

  return (
    <TouchableOpacity style={styles.featuredCard} onPress={onPress} activeOpacity={0.9}>
      {img ? (
        <Image source={{ uri: img }} style={styles.featuredImage} resizeMode="cover" />
      ) : (
        <View style={[styles.featuredImage, { backgroundColor: PLACEHOLDER_COLORS[colorIndex], justifyContent:"center", alignItems:"center" }]}>
          <Ionicons name={iconName} size={40} color="#1d4ed8" />
        </View>
      )}
      <View style={styles.featuredOverlay} />
      <View style={styles.featuredContent}>
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredBadgeText}>{sport}</Text>
        </View>
        <Text style={styles.featuredName} numberOfLines={1}>{name}</Text>
        {price != null && (
          <Text style={styles.featuredPrice}>LKR {price} / slot</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function VenueListCard({ facility, onPress }) {
  const name = facility.name || "Venue";
  const sport = facility.sportType || "Sport";
  const price = facility.pricePerHour;
  const img = facility.images?.[0];
  const loc = typeof facility.location === "object" ? facility.location?.address : facility.location;
  const colorIndex = (name.charCodeAt(0) || 0) % PLACEHOLDER_COLORS.length;
  const iconName = SPORT_ICONS[sport.toLowerCase()] || "fitness";

  return (
    <TouchableOpacity style={styles.venueCard} onPress={onPress} activeOpacity={0.88}>
      {img ? (
        <Image source={{ uri: img }} style={styles.venueImage} resizeMode="cover" />
      ) : (
        <View style={[styles.venueImage, { backgroundColor: PLACEHOLDER_COLORS[colorIndex], justifyContent:"center", alignItems:"center" }]}>
          <Ionicons name={iconName} size={28} color="#1d4ed8" />
        </View>
      )}
      <View style={styles.venueInfo}>
        <Text style={styles.venueName} numberOfLines={1}>{name}</Text>
        <View style={styles.venueMetaRow}>
          <Ionicons name="trophy-outline" size={12} color="#64748b" />
          <Text style={styles.venueMeta}>{sport}</Text>
        </View>
        {loc && (
          <View style={styles.venueMetaRow}>
            <Ionicons name="location-outline" size={12} color="#64748b" />
            <Text style={styles.venueMeta} numberOfLines={1}>{loc}</Text>
          </View>
        )}
        {price != null && (
          <Text style={styles.venuePrice}>LKR {price}<Text style={styles.venuePerHr}> /hr</Text></Text>
        )}
      </View>
      <View style={styles.venueArrow}>
        <Ionicons name="chevron-forward" size={18} color="#1d4ed8" />
      </View>
    </TouchableOpacity>
  );
}

export default function LandingScreen({ navigation }) {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState("All");
  const [searchFocused, setSearchFocused] = useState(false);
  const heroAnim = useRef(new Animated.Value(0)).current;

  const fetchFacilities = useCallback(async () => {
    try {
      const res = await api.get("/properties");
      setFacilities(res.data || []);
    } catch (e) {
      console.log("Fetch error:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFacilities();
    Animated.timing(heroAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, [fetchFacilities]);

  const onRefresh = () => { setRefreshing(true); fetchFacilities(); };

  const filtered = facilities.filter((f) => {
    const matchSport = selectedSport === "All" || f.sportType?.toLowerCase() === selectedSport.toLowerCase();
    const matchSearch = !searchQuery ||
      f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.sportType?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSport && matchSearch;
  });

  const featured = facilities.slice(0, 5);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
      >

        {/* ── HERO ── */}
        <View style={styles.hero}>
          {/* Decorative circles */}
          <View style={styles.circle1} />
          <View style={styles.circle2} />

          {/* Navbar */}
          <View style={styles.navbar}>
            <TouchableOpacity style={styles.logoRow} onPress={() => navigation.navigate("Landing")} activeOpacity={0.8}>
              <View style={styles.logoBox}>
                <Text style={styles.logoLetter}>S</Text>
              </View>
              <Text style={styles.logoText}>SPORTEK</Text>
            </TouchableOpacity>
            <View style={styles.navBtns}>
              <TouchableOpacity style={styles.navLoginBtn} onPress={() => navigation.navigate("Login")}>
                <Text style={styles.navLoginText}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navSignupBtn} onPress={() => navigation.navigate("Register")}>
                <Text style={styles.navSignupText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero text */}
          <Animated.View style={[styles.heroBody, { opacity: heroAnim, transform: [{ translateY: heroAnim.interpolate({ inputRange:[0,1], outputRange:[24,0] }) }] }]}>
            <View style={styles.heroBadge}>
              <Ionicons name="flash" size={12} color="#fbbf24" />
              <Text style={styles.heroBadgeText}>Sri Lanka&apos;s #1 Sports Platform</Text>
            </View>
            <Text style={styles.heroTitle}>Find &amp; Book{"\n"}Sports Venues</Text>
            <Text style={styles.heroSub}>Discover top facilities near you and{"\n"}reserve your slot in seconds.</Text>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{facilities.length}+</Text>
                <Text style={styles.statLbl}>Venues</Text>
              </View>
              <View style={styles.statDot} />
              <View style={styles.statBox}>
                <Text style={styles.statNum}>8+</Text>
                <Text style={styles.statLbl}>Sports</Text>
              </View>
              <View style={styles.statDot} />
              <View style={styles.statBox}>
                <Text style={styles.statNum}>4.8★</Text>
                <Text style={styles.statLbl}>Rating</Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* ── SEARCH ── */}
        <View style={styles.searchWrap}>
          <View style={[styles.searchBox, searchFocused && styles.searchBoxFocused]}>
            <Ionicons name="search" size={20} color={searchFocused ? "#1d4ed8" : "#94a3b8"} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search venues, sports..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── SPORT CATEGORIES ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by Sport</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catsRow}>
            {SPORT_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.label}
                style={[styles.catCard, selectedSport === cat.label && styles.catCardActive, { backgroundColor: selectedSport === cat.label ? cat.color : cat.bg }]}
                onPress={() => setSelectedSport(cat.label)}
                activeOpacity={0.8}
              >
                <Ionicons name={cat.icon} size={22} color={selectedSport === cat.label ? "#fff" : cat.color} />
                <Text style={[styles.catLabel, { color: selectedSport === cat.label ? "#fff" : cat.color }]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── FEATURED (horizontal scroll) ── */}
        {!searchQuery && selectedSport === "All" && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Venues</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {loading ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}>
                {[1,2,3].map(i => <View key={i} style={[styles.featuredCard, { backgroundColor:"#e2e8f0" }]} />)}
              </ScrollView>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
                {featured.map((f) => (
                  <FeaturedCard
                    key={f._id}
                    facility={f}
                    onPress={() => navigation.navigate("PublicFacilityDetail", { facility: f })}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* ── ALL VENUES LIST ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedSport === "All" ? "All Venues" : `${selectedSport} Venues`}
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{filtered.length}</Text>
            </View>
          </View>

          {loading ? (
            <View style={{ gap: 12 }}>
              {[1,2,3].map(i => <SkeletonCard key={i} />)}
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}>
                <Ionicons name="search-outline" size={32} color="#94a3b8" />
              </View>
              <Text style={styles.emptyTitle}>No venues found</Text>
              <Text style={styles.emptySub}>Try a different sport or search term</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {filtered.map((f) => (
                <VenueListCard
                  key={f._id}
                  facility={f}
                  onPress={() => navigation.navigate("PublicFacilityDetail", { facility: f })}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── CTA ── */}
        <View style={styles.ctaSection}>
          <View style={styles.ctaCard}>
            <View style={styles.ctaCircle1} />
            <View style={styles.ctaCircle2} />
            <View style={styles.ctaInner}>
              <View style={styles.ctaIconBox}>
                <Ionicons name="flash" size={24} color="#fbbf24" />
              </View>
              <Text style={styles.ctaTitle}>Ready to play?</Text>
              <Text style={styles.ctaSub}>Join thousands of players booking{"\n"}their favourite sports venues.</Text>
              <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate("Register")} activeOpacity={0.85}>
                <Text style={styles.ctaBtnText}>Create Free Account</Text>
                <Ionicons name="arrow-forward" size={16} color="#0f172a" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate("Login")} style={{ marginTop: 12 }}>
                <Text style={styles.ctaSignin}>Already have an account? <Text style={{ color:"#93c5fd", fontWeight:"700" }}>Sign In</Text></Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f1f5f9" },

  /* HERO */
  hero: {
    backgroundColor: "#0f172a",
    paddingBottom: 40,
    overflow: "hidden",
  },
  circle1: {
    position: "absolute", width: 280, height: 280, borderRadius: 140,
    backgroundColor: "rgba(29,78,216,0.25)", top: -80, right: -60,
  },
  circle2: {
    position: "absolute", width: 180, height: 180, borderRadius: 90,
    backgroundColor: "rgba(99,102,241,0.15)", bottom: -40, left: -40,
  },
  navbar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#1d4ed8", justifyContent: "center", alignItems: "center",
  },
  logoLetter: { fontSize: 20, fontWeight: "900", color: "#fff" },
  logoText: { fontSize: 18, fontWeight: "800", color: "#fff", letterSpacing: 2 },
  navBtns: { flexDirection: "row", gap: 8 },
  navLoginBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
  },
  navLoginText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  navSignupBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: "#1d4ed8",
  },
  navSignupText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  heroBody: { paddingHorizontal: 20, paddingTop: 28 },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(251,191,36,0.15)", alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginBottom: 14,
    borderWidth: 1, borderColor: "rgba(251,191,36,0.3)",
  },
  heroBadgeText: { fontSize: 11, color: "#fbbf24", fontWeight: "700" },
  heroTitle: {
    fontSize: 36, fontWeight: "900", color: "#fff",
    lineHeight: 42, marginBottom: 12,
  },
  heroSub: {
    fontSize: 14, color: "rgba(255,255,255,0.6)",
    lineHeight: 22, marginBottom: 28,
  },
  statsRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  statBox: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "800", color: "#fff" },
  statLbl: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 },
  statDot: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.15)" },

  /* SEARCH */
  searchWrap: { paddingHorizontal: 16, marginTop: -22, marginBottom: 4 },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 13,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 8,
    borderWidth: 1.5, borderColor: "transparent",
  },
  searchBoxFocused: { borderColor: "#1d4ed8" },
  searchInput: { flex: 1, fontSize: 15, color: "#1e293b" },

  /* SECTIONS */
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  seeAll: { fontSize: 13, color: "#1d4ed8", fontWeight: "700" },
  countBadge: {
    backgroundColor: "#eff6ff", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
  },
  countText: { fontSize: 12, color: "#1d4ed8", fontWeight: "700" },

  /* CATEGORIES */
  catsRow: { gap: 10, paddingBottom: 4 },
  catCard: {
    alignItems: "center", justifyContent: "center",
    width: 72, paddingVertical: 12, borderRadius: 16, gap: 6,
  },
  catCardActive: {
    shadowColor: "#1d4ed8", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  catLabel: { fontSize: 10, fontWeight: "700" },

  /* FEATURED */
  featuredRow: { gap: 12, paddingHorizontal: 20, paddingBottom: 4 },
  featuredCard: {
    width: SCREEN_WIDTH * 0.62, height: 180, borderRadius: 18, overflow: "hidden",
  },
  featuredImage: { width: "100%", height: "100%" },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  featuredContent: {
    position: "absolute", bottom: 0, left: 0, right: 0, padding: 14,
  },
  featuredBadge: {
    backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "flex-start",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 4,
  },
  featuredBadgeText: { fontSize: 10, color: "#fff", fontWeight: "700" },
  featuredName: { fontSize: 16, fontWeight: "800", color: "#fff" },
  featuredPrice: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 },

  /* VENUE LIST CARD */
  venueCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  venueImage: { width: 90, height: 90 },
  venueInfo: { flex: 1, padding: 12 },
  venueName: { fontSize: 15, fontWeight: "700", color: "#0f172a", marginBottom: 4 },
  venueMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  venueMeta: { fontSize: 12, color: "#64748b" },
  venuePrice: { fontSize: 14, fontWeight: "800", color: "#1d4ed8", marginTop: 4 },
  venuePerHr: { fontSize: 11, fontWeight: "400", color: "#94a3b8" },
  venueArrow: { paddingRight: 14 },

  /* SKELETON */
  skeletonCard: { height: 90, borderRadius: 16, backgroundColor: "#e2e8f0" },

  /* EMPTY */
  emptyBox: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#f1f5f9", justifyContent: "center", alignItems: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  emptySub: { fontSize: 13, color: "#94a3b8" },

  /* CTA */
  ctaSection: { paddingHorizontal: 20, marginTop: 24 },
  ctaCard: {
    backgroundColor: "#0f172a", borderRadius: 24,
    overflow: "hidden", position: "relative",
  },
  ctaCircle1: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    backgroundColor: "rgba(29,78,216,0.3)", top: -60, right: -40,
  },
  ctaCircle2: {
    position: "absolute", width: 120, height: 120, borderRadius: 60,
    backgroundColor: "rgba(99,102,241,0.2)", bottom: -30, left: -20,
  },
  ctaInner: { padding: 28, alignItems: "center" },
  ctaIconBox: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: "rgba(251,191,36,0.15)",
    justifyContent: "center", alignItems: "center", marginBottom: 14,
    borderWidth: 1, borderColor: "rgba(251,191,36,0.3)",
  },
  ctaTitle: { fontSize: 24, fontWeight: "900", color: "#fff", marginBottom: 8 },
  ctaSub: {
    fontSize: 14, color: "rgba(255,255,255,0.55)",
    textAlign: "center", lineHeight: 20, marginBottom: 22,
  },
  ctaBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fbbf24", borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 28,
  },
  ctaBtnText: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  ctaSignin: { fontSize: 13, color: "rgba(255,255,255,0.45)" },
});
