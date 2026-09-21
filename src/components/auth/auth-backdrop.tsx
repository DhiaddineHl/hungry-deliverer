import { useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';


// The food-ring + "hungry" logo artwork behind the auth cards, as a vector so it
// stays crisp at any size (and while it slides during the intro).
import AuthArt from '../../../assets/images/auth-bg.svg';
import { makeStyles } from '@/hooks/use-themed-styles';

const ART_RATIO = 917 / 412; // height / width of the source viewBox

type Props = {
  /** Animated (or static) style applied to the hero layer — drives the intro. */
  heroStyle?: React.ComponentProps<typeof Animated.View>['style'];
};

/** Full-screen navy background carrying the animated food/logo artwork. */
export function AuthBackdrop({ heroStyle }: Props) {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const artHeight = width * ART_RATIO;

  return (
    <View style={styles.fill} pointerEvents="none">
      <Animated.View style={[styles.hero, { width, height: artHeight }, heroStyle]}>
        <AuthArt width={width} height={artHeight} />
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.navy,
    overflow: 'hidden',
  },
  hero: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
}));
