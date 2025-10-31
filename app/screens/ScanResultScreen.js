import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Text from '../components/text';
import Header from '../components/header';
import BottomNav from '../components/bottomNav';
import * as Location from "expo-location";
import Geohash from 'ngeohash';
import { authenticateSignature, parseSignatureFragments } from '../../services/signatureAuthService';
import { getCert } from '../../services/certService';
import { getContinentFromGeohash } from '../../utils/continentMapping';

const ScanResultScreen = ({ navigation, route }) => {
  const [isValid, setIsValid] = useState(null);
  const [place, setPlace] = useState(null);
  const [commonName, setCommonName] = useState(null);

  /**
   * Parse QR data from new format (no delimiters)
   * Format:
   * - T{timestamp}{fragment}
   * - I{certID}{fragment}
   * - C{contentID}{fragment}
   * - L{len}{geohash}{fragment}
   */
  const parseQRData = (rawArray) => {
    const parsed = {
      who: 'Unknown',
      what: 'Unknown',
      where: 'Unknown',
      when: 'Unknown',
    };

    try {
      const fragments = parseSignatureFragments(rawArray);
      
      // Time (T)
      if (fragments.T?.data) {
        const ts = parseInt(fragments.T.data, 10);
        parsed.when = isNaN(ts)
          ? fragments.T.data
          : new Date(ts * 1000).toLocaleString();
      }
      
      // Identity (I) - certificate ID
      if (fragments.I?.data) {
        parsed.who = fragments.I.data;
      }
      
      // Content (C) - content ID
      if (fragments.C?.data) {
        parsed.what = fragments.C.data.slice(0, 8);
      }
      
      // Location (L) - geohash
      if (fragments.L?.data) {
        parsed.where = fragments.L.data;
      }
      
    } catch (err) {
      console.error("Error parsing QR data:", err);
    }

    return parsed;
  };

  const { qrData = [] } = route.params || {};

  const {who, what, where, when} = qrData.length >= 4
    ? parseQRData(qrData)
    : {who: 'Creator', what: 'Title', where: 'Location', when: 'Time'};

  useEffect(() => {
    const validate = async () => {
      if (qrData.length >= 4) {
        try {
          const result = await authenticateSignature(qrData);
          console.log("🔐 Signature valid:", result);
          setIsValid(result);
        } catch (err) {
          console.error("Error authenticating signature:", err);
          setIsValid(false);
        }
      } else {
        setIsValid(false);
      }
    };

    validate();
  }, [qrData]);

  const getLocationDisplayForPrecision = (precision, locationData, geohash) => {
    if (!locationData) return null;

    switch (precision) {
      case 1: // Continent level
        const continent = getContinentFromGeohash(geohash);
        return continent !== 'Unknown' ? continent : (locationData.country || 'Unknown Region');
      case 2: // Country level  
        return locationData.country || 'Unknown Country';
      case 3: // State level
        return locationData.region || locationData.country || 'Unknown Region';
      case 4: // County level
        return locationData.subregion || locationData.region || locationData.country || 'Unknown Area';
      case 5: // City level
        return locationData.city || locationData.subregion || locationData.region || 'Unknown City';
      case 6: // Neighborhood level
        return locationData.district || locationData.city || locationData.subregion || 'Unknown Neighborhood';
      case 7: // Street level
        return locationData.name || locationData.street || locationData.district || locationData.city || 'Unknown Street';
      case 8: // Address level
        return [
          locationData.name,
          locationData.street,
          locationData.city
        ].filter(Boolean).join(', ') || 'Unknown Address';
      default:
        // Fallback to most specific available
        return locationData.subregion || locationData.city || locationData.region || locationData.country || 'Unknown Location';
    }
  };

  // Reverse-geocode the (short) geohash to show a human place
  useEffect(() => {
    let cancelled = false;
    const decodeAndReverseGeocode = async () => {
      try {
        if (!where || typeof where !== 'string') {
          setPlace(null);
          return;
        }

        // Ensure same case as signing code (uppercase)
        const gh = where.trim().toUpperCase();
        
        // Get precision from geohash length
        const precision = gh.length;

        // decode returns object { latitude, longitude }
        const { latitude, longitude } = Geohash.decode(gh);

        // reverseGeocodeAsync expects an object
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });

        if (cancelled) return;

        if (Array.isArray(results) && results.length > 0) {
          const locationData = results[0];
          
          // Get appropriate display text based on precision
          const displayText = getLocationDisplayForPrecision(precision, locationData, gh);
          
          setPlace({
            displayText,
            precision,
            rawData: locationData,
            geohash: gh
          });
        } else {
          setPlace({
            displayText: where,
            precision,
            rawData: null,
            geohash: gh
          });
        }
      } catch (err) {
        console.warn('Reverse geocode failed:', err);
        setPlace({
          displayText: where,
          precision: where ? where.length : 0,
          rawData: null,
          geohash: where
        });
      }
    };

    decodeAndReverseGeocode();
    return () => { cancelled = true; };
  }, [where]);

  // Fetch common name from cert to show a real human name for Who
  useEffect(() => {
    console.log('Trying to get commonName');
    let cancelled = false;
    const fetchCommonName = async () => {
      try {
        if (!who || typeof who !== 'string') {
          setCommonName(null);
          return;
        }

        // request cert
        const cert = await getCert(who);

        if (cancelled) return;

        setCommonName(cert.name);
      } catch (err) {
        console.warn('fetchCommonName failed:', err);
        setCommonName(null);
      }
    };

    fetchCommonName();
    return () => { cancelled = true; };
  }, [who]);

  let iconSize = 60;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Header navigation={navigation}></Header>

      <View style={styles.content}>
        {/* Main Image with T-shaped QR code overlay */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: 'https://picsum.photos/800/500' }} 
            style={styles.mainImage} 
            resizeMode="cover"
          />
          <View style={styles.qrOverlay}>
            {/* T-shaped QR code */}
          </View>
        </View>

        {/* Creator Info */}
        <View style={styles.creatorContainer}>
          <Image 
            source={{ uri: 'https://picsum.photos/200/200?random=20' }} 
            style={styles.creatorImage} 
          />
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Who:</Text>
              <Text style={styles.infoValue}>
                { commonName ? (
                    commonName || who.slice(0, 8)
                  ) : (who.slice(0, 8) || 'Creator')
                }
               </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>What:</Text>
              <Text style={styles.infoValue}>{what}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Where:</Text>
              <Text style={styles.infoValue}>
                {place?.displayText || where || 'Location'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>When:</Text>
              <Text style={styles.infoValue}>{when}</Text>
            </View>
          </View>
        </View>
        <View style={styles.authenticationStatus}>
          {isValid === null && <Text>Checking Signature...</Text>}
          {isValid === true && <Text>✅ Valid</Text>}
          {isValid === false && <Text>❌ Invalid Signature</Text>}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>See Original</Text>
          </TouchableOpacity>
        </View>

        {/* Action Icons */}
        <View style={styles.iconContainer}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="link" size={iconSize} color="black" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialIcons name="report-gmailerrorred" size={iconSize} color="black" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Navigation */}
      <BottomNav navigation={navigation}></BottomNav>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFC107',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    flex: 3.5,
    marginBottom: 20,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  qrOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 60,
    height: 60,
    backgroundColor: '#FFC107',
    borderRadius: 5,
  },
  creatorContainer: {
    flexDirection: 'row',
    padding: 10,
    flex: 2, 
  },
  creatorImage: {
    width: 100,
    height: 100,
    borderRadius: 5,
    marginRight: 15,
  },
  infoContainer: {
    flex: 2,
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    width: '75%',
  },
  infoLabel: {
    fontWeight: 'bold',
    fontSize: 20,
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
  },
  authenticationStatus: {
    alignItems: 'center',
    marginBottom: 5,
  },
  actionContainer: {
    flex: 1,
  },
  actionButton: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    alignSelf: 'center',
  },
  actionButtonText: {
    fontSize: 20,
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flex: 1
  },
  iconButton: {
    marginHorizontal: 15,
  },
});

export default ScanResultScreen;