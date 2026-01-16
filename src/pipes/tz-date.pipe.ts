import { Pipe, PipeTransform } from "@angular/core";
import { formatInTimeZone } from "date-fns-tz";
import { normalizeServiceTimeZone } from "../utils/timezone-datetime";

@Pipe({
  name: "tzDate",
  standalone: true,
})
export class TzDatePipe implements PipeTransform {
  transform(
    value: string | Date | null | undefined,
    timeZone?: string | null,
    pattern: string = "dd/MM/yyyy HH:mm"
  ): string {
    if (!value) return "";

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const tz = normalizeServiceTimeZone(timeZone);
    return formatInTimeZone(date, tz, pattern);
  }
}
