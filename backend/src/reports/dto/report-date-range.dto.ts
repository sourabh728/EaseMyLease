import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class ReportDateRangeDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  /** Used by revenue-trend: day (default) or week. */
  @IsOptional()
  @IsIn(['day', 'week'])
  granularity?: 'day' | 'week';
}

export function resolveDateRange(fromDate?: string, toDate?: string) {
  const now = new Date();
  const to = toDate ? new Date(toDate) : endOfDay(now);
  const from = fromDate
    ? new Date(fromDate)
    : startOfDay(new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000));
  return { from, to };
}

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}
