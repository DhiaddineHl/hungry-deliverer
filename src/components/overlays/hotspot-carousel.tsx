import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import type { BusyPlace } from '@/features/session/types';

const GAP = Spacing.three;
const CARD_WIDTH = Math.min(Dimensions.get('window').width - 90, 340);
const SNAP = CARD_WIDTH + GAP;

type CardProps = {
  place: BusyPlace;
  onSelect: (place: BusyPlace) => void;
};

const BusyPlaceCard = memo(function BusyPlaceCard({ place, onSelect }: CardProps) {
  const handlePress = useCallback(() => onSelect(place), [onSelect, place]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text weight="semibold" size={14} color={Colors.white}>
          Nearest Busy Place
        </Text>
      </View>

      <View style={styles.body}>
        <Text weight="bold" size={20} numberOfLines={1}>
          {place.name}
        </Text>
        <Text size={15} color={Colors.text} style={styles.distance}>
          {place.distanceKm} km away
        </Text>

        <View style={styles.footer}>
          <Text size={15} color={Colors.textSecondary}>
            {place.description}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Navigate to ${place.name}`}
            onPress={handlePress}
            style={({ pressed }) => [styles.go, pressed && styles.pressed]}>
            <Ionicons name="arrow-forward" size={20} color={Colors.white} />
          </Pressable>
        </View>
      </View>
    </View>
  );
});

type Props = {
  places: BusyPlace[];
  onSelect: (place: BusyPlace) => void;
};

export function HotspotCarousel({ places, onSelect }: Props) {
  const renderItem = useCallback(
    ({ item }: { item: BusyPlace }) => <BusyPlaceCard place={item} onSelect={onSelect} />,
    [onSelect],
  );

  return (
    <FlatList
      horizontal
      data={places}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      showsHorizontalScrollIndicator={false}
      snapToInterval={SNAP}
      decelerationRate="fast"
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={Separator}
    />
  );
}

function keyExtractor(place: BusyPlace) {
  return place.id;
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing.five,
  },
  separator: {
    width: GAP,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    ...Shadow.card,
  },
  header: {
    backgroundColor: Colors.orange,
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  body: {
    padding: Spacing.four,
  },
  distance: {
    marginTop: 2,
  },
  footer: {
    marginTop: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  go: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
