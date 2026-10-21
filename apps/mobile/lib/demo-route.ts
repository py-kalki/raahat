export function sampleRoute(coordinates: [number, number][], steps = 60): [number, number][] {
  if (coordinates.length < 2 || coordinates.some(p => p.length !== 2 || p.some(v => !Number.isFinite(v)))) throw new Error('No valid route to simulate.');
  const distances = [0];
  for (let i = 1; i < coordinates.length; i++) {
    const [x, y] = coordinates[i], [px, py] = coordinates[i - 1];
    distances.push(distances[i - 1] + Math.hypot((x - px) * Math.cos(y * Math.PI / 180), y - py));
  }
  const total = distances[distances.length - 1];
  if (!total) throw new Error('The route has no distance to simulate.');
  let segment = 1;
  return Array.from({ length: steps + 1 }, (_, index) => {
    const target = total * index / steps;
    while (segment < distances.length - 1 && distances[segment] < target) segment++;
    const span = distances[segment] - distances[segment - 1];
    const ratio = span ? (target - distances[segment - 1]) / span : 0;
    return coordinates[segment - 1].map((v, axis) => v + (coordinates[segment][axis] - v) * ratio) as [number, number];
  });
}
