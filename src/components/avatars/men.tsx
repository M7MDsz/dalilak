// Dalilak avatars av-09..av-12: the four MEN.
//
// The cast (who they are · what makes the silhouette theirs at 32 px):
//  av-09 · a red shemagh with the black iqal, falling in the classic way: a broad tent with a dark band across the crown.
//          The red pattern is drawn as the map's dashed trail. A trimmed beard with a laugh inside it (the moustache
//          curves UP with the smile, never down).
//  av-10 · a white ghutra in the "cobra" fold: one low central peak with straight, slightly concave slopes down to the
//          iqal, and the side flaps lifted into wide wings below it. Young, clean-shaven, a calm smile, on the night ground.
//  av-11 · bare-headed with a cloud of curls, round metal glasses, stubble, a laugh, a denim-blue overshirt.
//  av-12 · bare-headed with a short quiff and a full rounded beard (drawn with contour lines like a hill), happy closed
//          eyes, a laugh inside the beard.
// Each wears the waypoint as the chest pin (parts.tsx PIN).
import { cloth, grounds, hair, marks, mix, skin, tok } from "./palette";
import { BODY, Brows, Cheeks, Ears, Eyes, Fold, MouthOpen, Neck, Nose, Pin, Smile, headPath, type Figure } from "./parts";

/** A thobe front: the band collar and the placket. */
function ThobeFront({ y = 77.6 }: { readonly y?: number }) {
  return <Fold color={cloth.white.fold} d={`M39.8 ${y}C44 ${y + 2.2} 52 ${y + 2.2} 56.2 ${y}M48 ${y + 2}V98`} />;
}

/** av-09 · red shemagh with iqal. */
export const av09: Figure = {
  ground: grounds.sky,
  trail: { r: 30, m: 36, l: 41, sway: 4 },
  draw() {
    const s = skin.s3;
    const red = marks.shemagh;
    const beard = hair.black.base;
    return (
      <>
        <path d={BODY} fill={cloth.white.base} />
        <path d="M35.2 58H60.8V79H35.2Z" fill={cloth.white.fold} />
        <Neck bottom={80} skin={s} top={62} w={12.4} x={41.8} />
        <ThobeFront />
        {/* the shemagh: a crown that falls in two drapes, open in front for the face, the neck and the thobe */}
        <path d="M48 12C31.6 12 23.4 23.6 23.4 39C23.4 56.6 19.8 70.4 12 83C17.8 87 24.6 89.6 31.4 90.6C34 83 35.4 73.6 35.8 62L60.2 62C60.6 73.6 62 83 64.6 90.6C71.4 89.6 78.2 87 84 83C76.2 70.4 72.6 56.6 72.6 39C72.6 23.6 64.4 12 48 12Z" fill={cloth.white.base} />
        <g fill="none" stroke={red} strokeDasharray="3.2 2.6" strokeLinecap="round" strokeWidth={1.8}>
          <path d="M28.2 44C27.6 58 25 70.4 19.8 82M67.8 44C68.4 58 71 70.4 76.2 82" />
          <path d="M32.4 64C32 73 30.8 80.4 29 87.6M63.6 64C64 73 65.2 80.4 67 87.6" />
          <path d="M35.6 17.6C39.6 15.6 43.6 14.8 48 14.8C52.4 14.8 56.4 15.6 60.4 17.6" />
        </g>
        <path d={headPath(48, 31, 49.6, 70, 14.4, 12)} fill={s.base} />
        {/* beard, the laugh inside it, the moustache that curves up */}
        <path d="M34 50.4C34.2 63.2 40.2 72.2 48 72.2C55.8 72.2 61.8 63.2 62 50.4C60.8 55 58.4 57.8 55.6 58L40.4 58C37.6 57.8 35.2 55 34 50.4Z" fill={beard} />
        <MouthOpen h={4.8} w={5.6} y={59.8} />
        <path d="M40.2 56.8Q48 60 55.8 56.8L56 58.6Q48 62 40 58.6Z" fill={beard} />
        <Brows color={beard} gap={7} kind="thick" y={44} />
        <Eyes gap={7} kind="dot" y={50.2} />
        <Nose size={1.04} skin={s} y={52} />
        {/* the shemagh's front fold, its trail, and the iqal */}
        <path d="M33 42C33.4 30.4 39.8 24 48 24C56.2 24 62.6 30.4 63 42C58.2 38.6 53.4 37 48 37C42.6 37 37.8 38.6 33 42Z" fill={cloth.white.base} />
        <Fold color={red} d="M35.4 40C39.4 37.6 43.4 36.4 48 36.4C52.6 36.4 56.6 37.6 60.6 40" dash="3.2 2.6" width={1.8} />
        <g fill="none" stroke={marks.iqal} strokeLinecap="round" strokeWidth={3.4}>
          <path d="M30.6 27.6C35.8 23.6 41.6 21.6 48 21.6C54.4 21.6 60.2 23.6 65.4 27.6" />
          <path d="M29.4 33C35 29 41.2 27 48 27C54.8 27 61 29 66.6 33" />
        </g>
        <Pin />
      </>
    );
  },
};

/** av-10 · white ghutra, cobra fold, with iqal. */
export const av10: Figure = {
  ground: grounds.night,
  trail: { r: 58, m: 53, l: 62, sway: 4 },
  draw() {
    const s = skin.s2;
    const c = cloth.white;
    return (
      <>
        {/* the cobra: one low peak with concave slopes to the iqal, the side flaps lifted into short wings below it,
            then falling straight to the shoulders (av-09's shemagh is the opposite: a round crown and a flared tent) */}
        <path
          d="M48 19.4C46 23 41.6 26.4 35.6 28.4C30 30 23.4 31.6 20.4 35.4C18.6 37.8 19.6 41.4 22.4 43.6C24 45 24.8 47.6 24.8 51C24.8 58.6 24.4 65.4 22.8 71.4C22.2 74 21.4 76.4 20.4 78.4L75.6 78.4C74.6 76.4 73.8 74 73.2 71.4C71.6 65.4 71.2 58.6 71.2 51C71.2 47.6 72 45 73.6 43.6C76.4 41.4 77.4 37.8 75.6 35.4C72.6 31.6 66 30 60.4 28.4C54.4 26.4 50 23 48 19.4Z"
          fill={c.base}
        />
        <path d="M31 58C31.6 67 33.4 73.6 36 79H60C62.6 73.6 64.4 67 65 58Z" fill={mix(c.fold, 38, c.base)} />
        <path d={BODY} fill={c.base} />
        <Neck bottom={80} skin={s} top={62} w={12.4} x={41.8} />
        <ThobeFront />
        <path d={headPath(48, 32, 50.4, 70.6, 14.2, 10.6)} fill={s.base} />
        {/* the front edge: pinched into a point over the forehead */}
        <path d="M32.6 48.4C32.8 36 39.4 28.4 48 28.4C56.6 28.4 63.2 36 63.4 48.4C58.6 44.8 53.6 42.4 48 40.4C42.4 42.4 37.4 44.8 32.6 48.4Z" fill={c.base} />
        <Fold color={c.fold} d="M48 21.6V39M21.8 39C26.4 39.8 30.8 38.6 34.6 35.8M74.2 39C69.6 39.8 65.2 38.6 61.4 35.8M27.6 50.6C28 58.4 27.6 66 26 73.4M68.4 50.6C68 58.4 68.4 66 70 73.4" />
        <g fill="none" stroke={marks.iqal} strokeLinecap="round" strokeWidth={3.4}>
          <path d="M31.6 30.4C36.8 27.2 42.2 25.8 48 25.8C53.8 25.8 59.2 27.2 64.4 30.4" />
          <path d="M30.8 35.4C36.2 32.2 41.8 30.8 48 30.8C54.2 30.8 59.8 32.2 65.2 35.4" />
        </g>
        <Cheeks gap={9.4} skin={s} y={58} />
        <Brows color={hair.black.base} gap={6.8} kind="raised" y={45.8} />
        <Eyes gap={6.8} kind="oval" y={51.6} />
        <Nose kind="line" skin={s} y={54} />
        <Smile depth={3.2} skin={s} thick={1.6} w={4.8} y={60.6} />
        <Pin />
      </>
    );
  },
};

/** av-11 · curls, round glasses. */
export const av11: Figure = {
  ground: grounds.ice,
  trail: { r: 58, m: 54, l: 64, sway: 4 },
  draw() {
    const s = skin.s5;
    const h = hair.black;
    const shirt = tok.contourInk;
    const shirtLight = mix(tok.contourInk, 74, marks.white);
    return (
      <>
        {/* overshirt open over a white tee, pocket on the far side */}
        <path d={BODY} fill={shirt} />
        <Neck bottom={80} skin={s} top={62} w={12.4} x={41.8} />
        <path d="M39.6 77.6C43 81.2 53 81.2 56.4 77.6L55.2 98L40.8 98Z" fill={cloth.white.base} />
        <Fold color={cloth.white.fold} d="M41 79.8C44.2 82.4 51.8 82.4 55 79.8" />
        <path d="M34.6 77.8L39.8 86.4L42 79.6Z" fill={shirtLight} stroke={shirtLight} strokeLinejoin="round" strokeWidth={1.2} />
        <path d="M61.4 77.8L56.2 86.4L54 79.6Z" fill={shirtLight} stroke={shirtLight} strokeLinejoin="round" strokeWidth={1.2} />
        <Fold color={mix(tok.contourInk, 55, marks.white)} d="M14.6 93C17.6 87 23 83 29.8 81.2M81.4 93C78.4 87 73 83 66.2 81.2M25.6 86.6H35.4V95.6C32 96.8 29 96.8 25.6 95.6Z" />
        <Pin />
        <Ears r={3.4} skin={s} x1={33.2} x2={62.8} y={52.4} />
        <path d={headPath(48, 31.6, 51, 70.8, 14.8, 11.6)} fill={s.base} />
        {/* stubble */}
        <path d="M33.4 54.4C34 65.6 40 71 48 71C56 71 62 65.6 62.6 54.4C60.8 61.4 55.8 65.4 48 65.4C40.2 65.4 35.2 61.4 33.4 54.4Z" fill={s.line} opacity={0.75} />
        {/* curls */}
        <g transform="translate(48 40) scale(0.93) translate(-48 -40)">
          <path d="M31 48C27.6 46.6 26 42.6 27.4 39.4C25.6 36 27 31.6 30.6 30.6C30 26.4 33 23 37 23.2C38.4 19.4 42.4 17.4 46.2 18.6C48.6 16 53 15.8 55.6 18.4C59.6 17.6 63.2 20.4 63.6 24.2C67.4 25 69.6 28.8 68.4 32.4C70.6 35.4 70.2 39.6 67.6 41.8C68.4 44.6 67.4 47.4 65 48.4C64.6 42 61.4 37.2 56.4 35.4C51 33.4 45 33.4 39.6 35.4C34.6 37.2 31.4 42 31 48Z" fill={h.base} />
          <Fold color={h.sheen} d="M35 28.4c1.4-1.8 3.8-2 5.2-.4M45.4 24.2c1.6-1.6 4-1.4 5.2.4M56.2 26c1.8-1 3.8-.2 4.4 1.6M30.6 38.4c.6-2 2.6-3 4.4-2.4M62.4 34.6c1.8.2 3 1.8 2.8 3.6M40.6 30.4c1.4-1.4 3.6-1.4 4.8 0M51.4 29.6c1.6-1 3.6-.6 4.4 1" width={1.4} />
        </g>
        <Cheeks gap={10.2} skin={s} y={58.6} />
        <Brows color={h.base} gap={6.9} kind="thick" y={44.2} />
        <Eyes gap={6.9} kind="dot" scale={0.9} y={51.6} />
        <g fill="none" stroke={marks.metal} strokeLinecap="round" strokeWidth={2}>
          <circle cx={41.1} cy={51.4} r={5.2} />
          <circle cx={54.9} cy={51.4} r={5.2} />
          <path d="M46.3 50.4Q48 49.2 49.7 50.4M35.9 50.6L33.6 49.8M60.1 50.6L62.4 49.8" />
        </g>
        <Nose kind="button" skin={s} y={54.6} />
        <MouthOpen h={5} w={6} y={60.4} />
      </>
    );
  },
};

/** av-12 · quiff and full beard. */
export const av12: Figure = {
  ground: grounds.dusk,
  trail: { r: 34, m: 40, l: 45, sway: 4 },
  draw() {
    const s = skin.s4;
    const h = hair.black;
    const collar = mix(tok.stage3, 84, marks.white);
    return (
      <>
        {/* quarter-zip */}
        <path d={BODY} fill={tok.stage3} />
        <Fold color={mix(tok.stage3, 60, marks.white)} d="M14.6 93C17.6 87 23 83 29.8 81.2M81.4 93C78.4 87 73 83 66.2 81.2" />
        <Neck bottom={78} skin={s} top={62} w={12.4} x={41.8} />
        <path d="M36.6 74.6C41.8 78 54.2 78 59.4 74.6L61 81.2C54.8 85.4 41.2 85.4 35 81.2Z" fill={collar} />
        <Fold color={mix(tok.stage3, 50, marks.white)} d="M48 80.6V98" />
        <Pin />
        <Ears r={3.5} skin={s} x1={33} x2={63} y={52.4} />
        <path d={headPath(48, 30, 50.4, 70.8, 14.8, 12.4)} fill={s.base} />
        {/* hair with a quiff */}
        <g transform="translate(48 40) scale(0.93) translate(-48 -40)">
          <path d="M31.8 47C30.2 34 36 24.4 45.6 22.6C50 21.6 55.2 21.4 59.2 23C63.4 23.6 66.4 26.2 66.4 29.8C66.8 31 66.2 32.4 65.6 33C66.4 37 66 42.4 64.2 47C63.2 40.6 60.6 36 56.4 34.2C53.8 33 50.6 32.4 47.6 32.6C43 32.8 38.4 34.4 35.6 37.4C33.6 39.8 32.4 43 31.8 47Z" fill={h.base} />
          <Fold color={h.sheen} d="M41 26.6C46 24.6 52.6 24.6 57.6 26.6M56.6 28.4C60 29.2 62.6 31 64 33.4" width={1.4} />
        </g>
        {/* the beard: a full round mass, drawn with contour lines like a hill */}
        <path d="M33.2 48.8C32.8 63.6 38.6 77 48 77.8C57.4 77 63.2 63.6 62.8 48.8C61.6 55.4 58 58.8 54.6 59L41.4 59C38 58.8 34.4 55.4 33.2 48.8Z" fill={h.base} />
        <Fold color={h.sheen} d="M36.2 61.4C39.2 69.4 43.2 73.2 48 73.4C52.8 73.2 56.8 69.4 59.8 61.4M40.6 66.6C42.8 69.2 45.2 70.4 48 70.4C50.8 70.4 53.2 69.2 55.4 66.6" width={1.3} />
        <MouthOpen h={4.4} w={5.4} y={60.6} />
        <path d="M40.4 57.8Q48 61 55.6 57.8L55.8 59.6Q48 63 40.2 59.6Z" fill={h.base} />
        <Cheeks gap={10} skin={s} y={53.6} />
        <Brows color={h.base} gap={7.1} kind="soft" width={2.2} y={44.6} />
        <Eyes gap={7.1} kind="happy" y={51} />
        <Nose size={1.04} skin={s} y={52.8} />
      </>
    );
  },
};
