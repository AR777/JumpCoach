import type { MetricId, PhaseId } from "../types";

/**
 * Coaching windows for a side-on long jump.
 *
 * Edit this file to change targets. Scores, phase weights, and the words on
 * the coaching sheet all read from here. Nothing in the UI hard-codes a range.
 *
 * These are coaching windows for a phone camera, not lab cutoffs. A 2D view
 * compresses anything that isn't square to the runway, and hang versus
 * hitch-kick changes the flight shape. Use the sheet to rank what to work on,
 * then look at the video again.
 *
 * Sources consulted while choosing the windows:
 * - Hay, J. G. (1986). The biomechanics of the long jump. Exercise and Sport Sciences Reviews.
 * - Lees, A., Graham-Smith, P., & Fowler, N. (1994). A biomechanical analysis of the last stride, touchdown, and takeoff characteristics of the men's long jump. Journal of Applied Biomechanics.
 * - Graham-Smith, P., & Lees, A. (2005). A three-dimensional kinematic analysis of the long jump take-off. Journal of Sports Sciences.
 * - Linthorne, N. P., Guzman, M. S., & Bridgett, L. A. (2005). Optimum take-off angle in the long jump. Journal of Sports Sciences.
 * - World Athletics coaching introduction to the long jump: lower on the penultimate, tall on the board, free knee, heels into the sand.
 *
 * Where a number is an operational measure invented for this app (hip-drop
 * percent, feet-ahead ratio, penultimate-mark gap), the metric note says so.
 */
export type MetricDefinition = {
  id: MetricId;
  label: string;
  phase: PhaseId;
  unit: string;
  idealMin: number;
  idealMax: number;
  tolerance: number;
  weight: number;
  impact: number;
  /** Timing metrics exist even when no pose was estimated. */
  requiresPose: boolean;
  source: string;
  keptTitle: string;
  keptBody: string;
  fixTitle: string;
  fixBody: string;
  drill: string;
  dose: string;
  how: string;
};

export const PHASE_WEIGHTS: Record<PhaseId, number> = {
  penultimate: 0.16,
  plant: 0.18,
  toeOff: 0.38,
  flight: 0.1,
  landing: 0.18,
};

export const PHASE_LABEL: Record<PhaseId, string> = {
  penultimate: "Penultimate",
  plant: "Plant",
  toeOff: "Toe-off",
  flight: "Flight",
  landing: "Landing",
};

export const METRICS: MetricDefinition[] = [
  {
    id: "hip_drop",
    label: "Hip drop on the penultimate",
    phase: "penultimate",
    unit: "%",
    idealMin: 6,
    idealMax: 14,
    tolerance: 8,
    weight: 1.2,
    impact: 1.15,
    requiresPose: true,
    source:
      "The lowering on the penultimate step is standard coaching (World Athletics; Hay 1986). The percent is JumpCoach's own 2D measure: hip height at the penultimate mark versus the median hip height earlier in the approach. It is not a published lab cutoff.",
    keptTitle: "The penultimate actually lowers",
    keptBody: "The hips drop into the penultimate instead of staying up on the toes. That is the step that sets up a flat, fast plant.",
    fixTitle: "The penultimate stays tall",
    fixBody: "Without a lower penultimate, the last step has to do the sinking and the takeoff goes flat or the knee collapses.",
    drill: "Long penultimate, quiet last",
    dose: "6 x 30m",
    how: "Mark the penultimate and the last step on the track. The penultimate is longer and the hips lower. The last step is quicker and flatter. No board yet.",
  },
  {
    id: "penultimate_gap",
    label: "Penultimate mark to plant",
    phase: "penultimate",
    unit: "s",
    idealMin: 0.14,
    idealMax: 0.32,
    tolerance: 0.18,
    weight: 0.6,
    impact: 0.55,
    requiresPose: false,
    source:
      "Timing between the penultimate mark (the low point of that step, not the first contact) and the plant. A coaching convenience for checking the last two steps are connected, not a lab interval.",
    keptTitle: "The last two steps stay connected",
    keptBody: "The gap from the penultimate mark to the board is in a useful range, so the last step is not a pause and not a stab.",
    fixTitle: "The last two steps are disconnected",
    fixBody: "If this gap is long, there is a float or a reach into the board. If it is tiny, the penultimate mark is probably sitting on the plant.",
    drill: "Two-step rhythm runs",
    dose: "5 x 25m",
    how: "Clap the penultimate and the plant. The second clap should arrive almost on the back of the first. Keep the run relaxed.",
  },
  {
    id: "knee_plant",
    label: "Takeoff knee at plant",
    phase: "plant",
    unit: "°",
    idealMin: 156,
    idealMax: 174,
    tolerance: 22,
    weight: 1.15,
    impact: 1.2,
    requiresPose: true,
    source:
      "Touchdown knee is relatively extended rather than collapsed. Lees, Graham-Smith, and Fowler (1994) describe an extended knee at takeoff contact. 180° is straight in this app.",
    keptTitle: "The plant knee stays tall",
    keptBody: "You meet the board with the knee already fairly long, so the contact can push instead of sink.",
    fixTitle: "The plant knee folds",
    fixBody: "A soft knee at plant spends the contact catching the body. Speed leaks into the board.",
    drill: "Tall board contacts",
    dose: "5 x 4 contacts",
    how: "Short approach. Strike under a tall knee and bounce off. Stop the set if the knee folds on the way in.",
  },
  {
    id: "trunk_plant",
    label: "Trunk at plant",
    phase: "plant",
    unit: "°",
    idealMin: -8,
    idealMax: 12,
    tolerance: 14,
    weight: 0.7,
    impact: 0.7,
    requiresPose: true,
    source:
      "Coaches ask for a tall trunk at touchdown, close to vertical. Positive degrees here mean the shoulders are ahead of the hips.",
    keptTitle: "The trunk is tall at the board",
    keptBody: "You arrive stacked instead of folding toward the pit or leaning back off the plant.",
    fixTitle: "The trunk is off vertical at plant",
    fixBody: "A pitched trunk at touchdown usually means the plant foot is too far ahead, or the penultimate never lowered.",
    drill: "Broomstick runs into a plant",
    dose: "6 reps",
    how: "Hold a stick along the spine for a short approach and a pop-up. The stick stays put through the plant. No full-speed jumping until it does.",
  },
  {
    id: "contact_time",
    label: "Time on the board",
    phase: "plant",
    unit: "s",
    idealMin: 0.1,
    idealMax: 0.16,
    tolerance: 0.1,
    weight: 0.95,
    impact: 1,
    requiresPose: false,
    source:
      "Elite takeoff support is short, often around 0.11–0.13 s (Hay 1986; Graham-Smith & Lees 2005). The window is widened for developing athletes filmed on a phone.",
    keptTitle: "The board contact is short",
    keptBody: "You are on and off the board. A short contact only helps if the knee stays tall, and here the timing is in range.",
    fixTitle: "The board contact is the wrong length",
    fixBody: "A long contact usually means the foot reached and the knee sank. A very short one can skip the hip extension.",
    drill: "Board runs, bounce not sit",
    dose: "4 x 20m",
    how: "Six to eight strides, hit the board, and leave. If you hear a long scrape, shorten the last step and stay taller.",
  },
  {
    id: "knee_toeoff",
    label: "Takeoff knee at toe-off",
    phase: "toeOff",
    unit: "°",
    idealMin: 165,
    idealMax: 180,
    tolerance: 20,
    weight: 1.15,
    impact: 1.2,
    requiresPose: true,
    source:
      "The takeoff knee should finish extended as the foot leaves. Graham-Smith and Lees (2005) track the knee through the takeoff. 180° is straight.",
    keptTitle: "The takeoff knee finishes",
    keptBody: "The knee is long as the foot leaves, so the hip has something to push against.",
    fixTitle: "The takeoff knee never straightens",
    fixBody: "Leaving with a bent knee cuts the push off early. The free knee can look busy while the support leg is still soft.",
    drill: "Wall-end takeoffs",
    dose: "3 x 5",
    how: "Stand a stride from a wall. Plant and drive the hip through until the takeoff knee straightens. Walk back. Add a short run only after the knee finishes.",
  },
  {
    id: "hip_extension",
    label: "Hip extension at toe-off",
    phase: "toeOff",
    unit: "°",
    idealMin: 165,
    idealMax: 185,
    tolerance: 20,
    weight: 1.2,
    impact: 1.25,
    requiresPose: true,
    source:
      "A tall hip at toe-off is the usual coaching picture of an extended takeoff. The angle is shoulder–hip–knee of the takeoff leg, so 180° is a straight line through the hip.",
    keptTitle: "The hip finishes tall",
    keptBody: "At toe-off the takeoff hip is open. That is the part of the jump that keeps speed from dying on the board.",
    fixTitle: "The hip stays folded at toe-off",
    fixBody: "If the hip is still sitting when the foot leaves, the takeoff is a reach instead of a push.",
    drill: "Line pop-ups",
    dose: "4 x 20m",
    how: "Last step hits a line and the hip pops tall. Think of the belt buckle moving forward over the foot, not the chest diving.",
  },
  {
    id: "trunk_toeoff",
    label: "Trunk at toe-off",
    phase: "toeOff",
    unit: "°",
    idealMin: -8,
    idealMax: 12,
    tolerance: 14,
    weight: 0.8,
    impact: 0.85,
    requiresPose: true,
    source:
      "A slight forward or nearly vertical trunk at takeoff. Large forward lean usually means the athlete rotated over a blocking foot. Positive is shoulders ahead of the hips.",
    keptTitle: "The trunk leaves tall",
    keptBody: "You leave without diving at the sand or throwing the shoulders back.",
    fixTitle: "The trunk leaves tipped",
    fixBody: "A big forward pitch at toe-off usually comes from planting too far in front. A deep backward lean stalls the run.",
    drill: "Stick-on-the-back pop-ups",
    dose: "6 reps",
    how: "Broomstick along the spine, short approach, leave the board without the stick rolling off the shoulder.",
  },
  {
    id: "takeoff_angle",
    label: "Takeoff angle",
    phase: "toeOff",
    unit: "°",
    idealMin: 16,
    idealMax: 24,
    tolerance: 10,
    weight: 1.4,
    impact: 1.5,
    requiresPose: true,
    source:
      "The long jump takeoff is much flatter than 45°. Linthorne, Guzman, and Bridgett (2005) put the practical optimum near 20°, depending on speed. This app estimates it from hip travel in the first tenth of a second after toe-off.",
    keptTitle: "The leave is at a useful angle",
    keptBody: "The hip leaves upward without the run turning into a high jump. That is the trade elite jumps live on.",
    fixTitle: "The takeoff angle is off",
    fixBody: "Too flat and the flight never develops. Too steep and the runway speed was spent going up.",
    drill: "Pop-up from a short run",
    dose: "4 x 8 strides",
    how: "The goal is a tall free knee and a visible rise, not distance. If the flight is flat, shorten the run and finish the hip. If it is a steep pop, take a longer run and keep the last step under you.",
  },
  {
    id: "knee_drive",
    label: "Free-knee drive",
    phase: "toeOff",
    unit: "°",
    idealMin: -5,
    idealMax: 25,
    tolerance: 20,
    weight: 1,
    impact: 1.15,
    requiresPose: true,
    source:
      "The free thigh should reach about parallel or a little above. 0° is thigh horizontal and forward. Positive is the knee above that line.",
    keptTitle: "The free knee drives",
    keptBody: "The swing thigh is up at toe-off, which is what holds the takeoff from collapsing forward.",
    fixTitle: "The free knee is late or low",
    fixBody: "A low swing leg lets the trunk pitch and the takeoff angle go flat.",
    drill: "Switch-knee, then four runs",
    dose: "3 x 20s plus 4 runs",
    how: "On the spot, switch the free thigh to parallel and hold one count. Then four short runs where the thigh hits that same height at the board.",
  },
  {
    id: "trunk_flight",
    label: "Trunk through mid-flight",
    phase: "flight",
    unit: "°",
    idealMin: -5,
    idealMax: 18,
    tolerance: 16,
    weight: 0.7,
    impact: 0.6,
    requiresPose: true,
    source:
      "A controlled trunk in the air, whether the athlete hangs or hitch-kicks. This does not pick a flight style. Positive is shoulders ahead of the hips.",
    keptTitle: "The flight stays organized",
    keptBody: "Mid-flight the trunk is quiet enough that the landing can be prepared, instead of a spin off the board.",
    fixTitle: "The flight trunk is unsettled",
    fixBody: "If the chest is already diving, or the shoulders are thrown back, the landing starts too early or too late.",
    drill: "Hang holds off a short run",
    dose: "4 x short approach",
    how: "Leave, settle the arms, and hold a quiet shape until the heels start forward. Style can be hang or hitch. The trunk should not thrash.",
  },
  {
    id: "flight_time",
    label: "Time in the air",
    phase: "flight",
    unit: "s",
    idealMin: 0.42,
    idealMax: 0.85,
    tolerance: 0.25,
    weight: 0.45,
    impact: 0.4,
    requiresPose: false,
    source:
      "A descriptive window for a full jump filmed from penultimate through the pit. Flight time depends on speed. It is scored lightly because a short approach or a clipped clip will sit outside it.",
    keptTitle: "The flight has time to work",
    keptBody: "There is enough air time to use, which usually means the takeoff sent the hips up as well as along.",
    fixTitle: "The flight time looks off for a full jump",
    fixBody: "Very short air time on a full approach usually means a flat leave. A very long time on a slow run can mean a steep pop. Check the clip actually contains the whole flight.",
    drill: "Full-flight run-throughs",
    dose: "4 x competition approach",
    how: "Film side-on again with the whole pit in frame. Judge the flight only after the markers sit on the real toe-off and the real landing.",
  },
  {
    id: "landing_knee",
    label: "Lead knee at landing",
    phase: "landing",
    unit: "°",
    idealMin: 150,
    idealMax: 178,
    tolerance: 22,
    weight: 1,
    impact: 0.9,
    requiresPose: true,
    source:
      "Heels reach the sand with the legs relatively extended, then the knees give. 180° is straight. Measured on the foot that is farther forward.",
    keptTitle: "The legs reach",
    keptBody: "The lead leg is long as the heels arrive, which is what lets the hips travel past the mark.",
    fixTitle: "The landing legs are already bent",
    fixBody: "Sitting the knees down early drops the hips behind the heels and gives distance back.",
    drill: "Feet-first pit sits",
    dose: "5 reps",
    how: "Short approach. Reach the heels, then fold into the pit. Do not sit back. If the knees bend before the sand, slow the approach and reach earlier.",
  },
  {
    id: "landing_trunk",
    label: "Trunk at landing",
    phase: "landing",
    unit: "°",
    idealMin: 18,
    idealMax: 48,
    tolerance: 18,
    weight: 0.85,
    impact: 0.85,
    requiresPose: true,
    source:
      "As the heels reach, the chest comes toward the thighs so the hips can slide through. Positive is shoulders ahead of the hips.",
    keptTitle: "The chest follows the heels",
    keptBody: "The trunk is forward as the feet land, which is the shape that lets the hips pass the mark.",
    fixTitle: "The chest stays up at landing",
    fixBody: "An upright landing parks the hips behind the feet. The jump ends at the heels.",
    drill: "Chin-to-knee landings",
    dose: "5 reps",
    how: "From a short run, reach the heels and curl the chest toward the thighs as the sand arrives. The fold is the landing, not an afterthought.",
  },
  {
    id: "feet_ahead",
    label: "Feet ahead of the hips",
    phase: "landing",
    unit: "ratio",
    idealMin: 0.22,
    idealMax: 0.7,
    tolerance: 0.28,
    weight: 0.9,
    impact: 0.9,
    requiresPose: true,
    source:
      "JumpCoach measure: horizontal distance from hip to the forward ankle, divided by that leg's hip-to-ankle length. 0 means the foot is under the hip. This is an operational ratio, not a published normative.",
    keptTitle: "The heels get in front",
    keptBody: "The feet land ahead of the hips, so there is a mark to fold past.",
    fixTitle: "The feet are not ahead of the hips",
    fixBody: "Landing with the feet under you, or so far ahead that the legs collapse, both give distance away.",
    drill: "Heel-reach falls",
    dose: "5 reps in the pit",
    how: "Stand in the sand, fall forward, shoot the heels, and let the hips follow. Then do the same off three strides.",
  },
];

export const METRIC_BY_ID: Record<MetricId, MetricDefinition> = METRICS.reduce(
  (map, metric) => {
    map[metric.id] = metric;
    return map;
  },
  {} as Record<MetricId, MetricDefinition>,
);
