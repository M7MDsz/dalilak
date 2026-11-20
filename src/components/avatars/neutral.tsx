// Dalilak avatars av-01..av-04: the four NEUTRAL figures. Every new account gets one of these (spec 9.6: «خالد» gets
// av-01, «محمد» gets av-03), so they must carry no gender cue at all. The rule used for all four:
//  - ears and hairline are covered by headwear that anyone wears (a hat pulled low, an aviator cap with ear flaps, a parka
//    hood, a beanie under headphones): no hair is shown, so no haircut can say man or woman;
//  - narrow, soft faces (half-width at most 14.2, jaw at most 9.8), soft brows, no lashes, no facial hair;
//  - a small closed smile or a slight open smile, never the open laugh; mid skin tones; roomy clothes.
//
// The cast (who they are · what makes the silhouette theirs at 32 px):
//  av-01 the traveller  · a bucket hat pulled low, its brim drooping over the ears: a wide arc with two hanging tips.
//                         The band is a dashed trail. Navy, on the dusk ground.
//  av-02 the navigator  · a leather aviator cap with fleece-trimmed ear flaps and goggles pushed up: a round cap with two
//                         light lenses on top and flaps to the jaw.
//  av-03 the wayfarer   · a forest-green parka hood whose rim is the logo's arch (open at the bottom), a high zip collar.
//  av-04 the maker      · a teal knit beanie under ink headphones: the band is an arch, the cups give the head two blocks.
// Each wears the waypoint as the chest pin (parts.tsx PIN).
import { cloth, grounds, hair, marks, mix, skin, tok } from "./palette";
import { BODY, Brows, Cheeks, Eyes, Fold, MouthOpen, Neck, Nose, Pin, Smile, headPath, type Figure } from "./parts";

/** av-01 · the traveller. */
export const av01: Figure = {
  ground: grounds.dusk,
  trail: { r: 40, m: 46, l: 53, sway: 4 },
  draw() {
    const s = skin.s2;
    const hat = tok.stage3;
    const hatLine = mix(tok.stage3, 56, marks.white);
    return (
      <>
        {/* jacket with lapels, a cream neckerchief */}
        <path d={BODY} fill={tok.ink} />
        <Fold color={mix(tok.ink, 52, tok.contour2)} d="M14.6 93C17.6 87 23 83 29.8 81.2M81.4 93C78.4 87 73 83 66.2 81.2M35.4 78.4L41.4 92M60.6 78.4L54.6 92" />
        <Neck bottom={80} skin={s} top={62} w={11} x={42.5} />
        <path d="M36.2 76.2C41.2 80.2 54.8 80.2 59.8 76.2L61.2 79.6C55.8 84.2 40.2 84.2 34.8 79.6Z" fill={cloth.cream.base} />
        <path d="M41.6 81.6L54.4 81.6L48 89.6Z" fill={cloth.cream.base} stroke={cloth.cream.base} strokeLinejoin="round" strokeWidth={2.4} />
        <Fold color={cloth.cream.fold} d="M44.4 84.2L48 88.2L51.6 84.2" />
        <Pin />
        <path d={headPath(48, 32.5, 50.4, 70.6, 14.2, 9.6)} fill={s.base} />
        <Cheeks gap={9.2} skin={s} y={57.8} />
        <Brows color={hair.espresso.base} gap={6.7} kind="soft" width={1.7} y={46.2} />
        <Eyes gap={6.7} kind="oval" y={51.8} />
        <Nose size={0.95} skin={s} y={54.2} />
        <Smile depth={2.8} skin={s} w={4.4} y={60.8} />
        {/* bucket hat: crown, a band carrying the dashed trail, and a brim that droops over the ears */}
        <path d="M35.2 37C34.8 25.4 40.4 20 48 20C55.6 20 61.2 25.4 60.8 37Z" fill={hat} />
        <Fold color={hatLine} d="M42.4 22.6C46 24.4 50 24.4 53.6 22.6" />
        <path d="M35.3 31C42 29.4 54 29.4 60.7 31L60.9 36.8C54 35.2 42 35.2 35.1 36.8Z" fill={tok.ink} />
        <Fold color={cloth.cream.base} d="M37.6 33.4C43 32.4 53 32.4 58.4 33.4" dash="2.4 2.2" width={1.4} />
        <path
          d="M18.6 53.4C21.6 46 27.6 40.4 35 36.8C42 35.2 54 35.2 61 36.8C68.4 40.4 74.4 46 77.4 53.4C75.2 55.4 71.6 55.8 68 54.8C66 54.2 64.2 53.2 62.4 52C62.6 49.6 62.6 47.8 62.2 46.4C59.4 43.6 54.4 42 48 42C41.6 42 36.6 43.6 33.8 46.4C33.4 47.8 33.4 49.6 33.6 52C31.8 53.2 30 54.2 28 54.8C24.4 55.8 20.8 55.4 18.6 53.4Z"
          fill={hat}
        />
        <Fold color={hatLine} d="M22.6 51.4C25.6 45.6 30.8 41.4 37.6 39.2M73.4 51.4C70.4 45.6 65.2 41.4 58.4 39.2" />
      </>
    );
  },
};

/** av-02 · the navigator. */
export const av02: Figure = {
  ground: grounds.ice,
  trail: { r: 46, m: 52, l: 58, sway: 5 },
  draw() {
    const s = skin.s3;
    const cap = cloth.leather;
    const fleece = cloth.fleece;
    return (
      <>
        {/* bomber jacket with a fleece collar */}
        <path d={BODY} fill={tok.ink} />
        <Fold color={mix(tok.ink, 52, tok.contour2)} d="M14.6 93C17.6 87 23 83 29.8 81.2M81.4 93C78.4 87 73 83 66.2 81.2M48 87V98" />
        <Neck bottom={80} skin={s} top={62} w={11} x={42.5} />
        <path d="M31 78.4C37 76.2 42.6 76.4 48 80C53.4 76.4 59 76.2 65 78.4L67 83.2C60.6 82.4 53.6 83.4 48 87.2C42.4 83.4 35.4 82.4 29 83.2Z" fill={fleece.base} />
        <Fold color={fleece.fold} d="M33.6 80.8C38.6 80 43.4 81 48 84.2C52.6 81 57.4 80 62.4 80.8" width={1.3} />
        <Pin />
        <path d={headPath(48, 33, 50.6, 70.8, 14, 9.6)} fill={s.base} />
        <Cheeks gap={9} skin={s} y={57.6} />
        <Brows color={hair.espresso.base} gap={6.6} kind="soft" width={1.7} y={46.4} />
        <Eyes gap={6.6} kind="dot" y={51.8} />
        <Nose kind="button" size={0.9} skin={s} y={54} />
        <MouthOpen h={2.8} teeth={false} w={4.4} y={60} />
        {/* the cap and its ear flaps in one piece, the fleece trim around the face, seams, goggles pushed up */}
        <path
          d="M48 21.6C58.8 21.6 66 30 66.4 41.6C66.6 48.4 67.2 56 68 62.6C68.4 65.6 66.6 67.8 63.8 67.8C61.2 67.8 59.6 66 59.6 63.4L60.2 47.4C57.8 43.6 53.4 41.6 48 41.6C42.6 41.6 38.2 43.6 35.8 47.4L36.4 63.4C36.4 66 34.8 67.8 32.2 67.8C29.4 67.8 27.6 65.6 28 62.6C28.8 56 29.4 48.4 29.6 41.6C30 30 37.2 21.6 48 21.6Z"
          fill={cap.base}
        />
        <Fold color={cap.fold} d="M48 22.6V30M37.8 26.4C35.4 30.6 34.2 35.6 34.4 40.6M58.2 26.4C60.6 30.6 61.8 35.6 61.6 40.6M30.6 50C30.2 55 29.8 59.4 29.6 63M65.4 50C65.8 55 66.2 59.4 66.4 63" width={1.3} />
        <path d="M36.2 63.6L35.8 47.4C38.2 43.6 42.6 41.6 48 41.6C53.4 41.6 57.8 43.6 60.2 47.4L59.8 63.6" fill="none" stroke={fleece.base} strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.2} />
        <path d="M29.8 35C35 32.2 41.2 31 48 31C54.8 31 61 32.2 66.2 35" fill="none" stroke={cloth.charcoal.base} strokeLinecap="round" strokeWidth={2.8} />
        <g fill={mix(tok.contour, 55, marks.white)} stroke={cloth.charcoal.base} strokeWidth={2}>
          <circle cx={41.2} cy={31.4} r={4.5} />
          <circle cx={54.8} cy={31.4} r={4.5} />
        </g>
        <Fold color={marks.white} d="M38.8 30.2C39.2 29 40.2 28.4 41.4 28.4M52.4 30.2C52.8 29 53.8 28.4 55 28.4" width={1.2} />
      </>
    );
  },
};

/** av-03 · the wayfarer. */
export const av03: Figure = {
  ground: grounds.sky,
  trail: { r: 36, m: 42, l: 48, sway: 4 },
  draw() {
    const s = skin.s2;
    const c = cloth.forest;
    return (
      <>
        {/* parka */}
        <path d={BODY} fill={c.base} />
        <Fold color={c.fold} d="M14.6 93C17.6 87 22.4 82.6 28.6 80M81.4 93C78.4 87 73.6 82.6 67.4 80" />
        {/* the hood: a roomy shell with a seam, the deep inside, then the face */}
        <path d="M48 15C61 15 71.6 23.4 74.2 37C76 47.4 75.2 58.4 71.6 68.6L69.4 74H26.6L24.4 68.6C20.8 58.4 20 47.4 21.8 37C24.4 23.4 35 15 48 15Z" fill={c.base} />
        <Fold color={c.fold} d="M48 16.4V29M24.6 44.6C24.4 52.4 25.4 60.2 28.2 67M71.4 44.6C71.6 52.4 70.6 60.2 67.8 67" />
        <path d="M30.6 72.4C28.8 64.8 28.4 57.2 28.8 50.2C29.6 40.6 37.4 34.6 48 34.6C58.6 34.6 66.4 40.6 67.2 50.2C67.6 57.2 67.2 64.8 65.4 72.4Z" fill={c.shade} />
        <path d={headPath(48, 33, 50.4, 70, 13.6, 9.4)} fill={s.base} />
        <Cheeks gap={8.8} skin={s} y={57.2} />
        <Brows color={hair.espresso.base} gap={6.4} kind="soft" width={1.8} y={45.6} />
        <Eyes gap={6.4} kind="oval" y={51.2} />
        <Nose kind="button" size={0.9} skin={s} y={53.6} />
        <Smile depth={2.8} skin={s} w={4.2} y={60.2} />
        {/* the rim: the logo's arch, open at the bottom where the collar closes */}
        <path d="M30.6 72.4C28.8 64.8 28.4 57.2 28.8 50.2C29.6 40.6 37.4 34.6 48 34.6C58.6 34.6 66.4 40.6 67.2 50.2C67.6 57.2 67.2 64.8 65.4 72.4" fill="none" stroke={c.rim} strokeWidth={5.2} />
        <Fold color={c.fold} d="M28.2 72.4C26.4 64.8 26 57.2 26.4 50C27.2 39 36 32.2 48 32.2C60 32.2 68.8 39 69.6 50C70 57.2 69.6 64.8 67.8 72.4" width={1.2} />
        {/* the high zip collar, the drawstrings */}
        <path d="M30.4 70.4C37 74.4 59 74.4 65.6 70.4L67.6 79.6C59.6 83.6 36.4 83.6 28.4 79.6Z" fill={c.base} />
        <Fold color={c.rim} d="M31.2 71.8C37.6 75.4 58.4 75.4 64.8 71.8" width={1.4} />
        <Fold color={c.fold} d="M48 74.6V98" />
        <Fold color={cloth.cream.base} d="M40.6 76C40.3 78.8 40.2 81 40.4 83.2M55.4 76C55.7 78.8 55.8 81 55.6 83.2" width={1.5} />
        <circle cx={40.4} cy={84} fill={cloth.cream.base} r={1.4} />
        <circle cx={55.6} cy={84} fill={cloth.cream.base} r={1.4} />
        <Pin />
      </>
    );
  },
};

/** av-04 · the maker. */
export const av04: Figure = {
  ground: grounds.dusk,
  trail: { r: 62, m: 56, l: 67, sway: 4 },
  draw() {
    const s = skin.s4;
    const knit = cloth.teal;
    return (
      <>
        {/* cream sweater with a ribbed crew neck */}
        <path d={BODY} fill={cloth.cream.base} />
        <Fold color={cloth.cream.fold} d="M14.6 93C17.6 87 23 83 29.8 81.2M81.4 93C78.4 87 73 83 66.2 81.2M25.6 98C26.6 93 28.2 89 30.6 86M70.4 98C69.4 93 67.8 89 65.4 86" />
        <Neck bottom={80} skin={s} top={62} w={11} x={42.5} />
        <path d="M37.2 76.4C41.8 80.2 54.2 80.2 58.8 76.4L60.4 79.4C55.2 84.4 40.8 84.4 35.6 79.4Z" fill={cloth.cream.fold} />
        <Pin />
        <path d={headPath(48, 32.6, 50.6, 70.8, 14.2, 9.8)} fill={s.base} />
        <Cheeks gap={9.4} skin={s} y={58} />
        <Brows color={hair.black.base} gap={6.8} kind="soft" width={1.7} y={46.4} />
        <Eyes gap={6.8} kind="half" y={52} />
        <Nose kind="line" skin={s} y={54.2} />
        <Smile depth={3} skin={s} w={4.6} y={60.8} />
        {/* beanie: crown with ribs, the folded cuff */}
        <path d="M31 42C30.4 28 38 18.4 48 18.4C58 18.4 65.6 28 65 42Z" fill={knit.base} />
        <Fold color={knit.fold} d="M38.4 22.4C36.8 25.8 36 29.2 35.8 33M48 19.4V33M57.6 22.4C59.2 25.8 60 29.2 60.2 33" width={1.3} />
        <path d="M30.2 35.4C38.6 32.6 57.4 32.6 65.8 35.4L66.2 43.4C57.4 41 38.6 41 29.8 43.4Z" fill={knit.cuff} />
        <Fold color={knit.fold} d="M34 36.2v5.4M38 35.4v5.4M42 34.9v5.4M46 34.7v5.4M50 34.7v5.4M54 34.9v5.4M58 35.4v5.4M62 36.2v5.4" width={1.2} />
        {/* headphones: the band is an arch over the beanie, the cups cover the ears */}
        <path d="M28.8 48.6C27.4 30.2 36.4 16.2 48 16.2C59.6 16.2 68.6 30.2 67.2 48.6" fill="none" stroke={tok.ink} strokeLinecap="round" strokeWidth={4.4} />
        <rect fill={tok.ink} height={18} rx={4.4} width={9.4} x={23.6} y={45} />
        <rect fill={tok.ink} height={18} rx={4.4} width={9.4} x={63} y={45} />
        <rect fill={cloth.charcoal.fold} height={13} rx={1.6} width={3.2} x={31.4} y={47.6} />
        <rect fill={cloth.charcoal.fold} height={13} rx={1.6} width={3.2} x={61.4} y={47.6} />
      </>
    );
  },
};
