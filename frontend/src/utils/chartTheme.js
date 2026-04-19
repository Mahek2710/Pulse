export function getChartColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    grid:    style.getPropertyValue('--chart-grid').trim()   || '#1a1a1a',
    text:    style.getPropertyValue('--chart-text').trim()   || '#3a3a3a',
    accent:  style.getPropertyValue('--accent').trim()       || '#c8f135',
    danger:  style.getPropertyValue('--danger').trim()       || '#ff6b6b',
    warn:    style.getPropertyValue('--warn').trim()         || '#faad14',
    good:    style.getPropertyValue('--good').trim()         || '#c8f135',
  };
}