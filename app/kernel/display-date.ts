import moment from 'moment'
import 'moment/dist/locale/ms'

export type DatePattern =
    | 'DD/MM/YYYY'  // 12/11/2026
    | 'D MMM YYYY'  // 12 Nov 2026
    | 'MMM YYYY'    // Nov 2026
    | 'dddd, D MMMM' // Thursday, 12 November
    | 'dddd, D MMM'  // Thursday, 12 Nov
    | 'ddd'          // Thu
    | 'D'           // 12

export function displayDate(date: string, locale: string, pattern: DatePattern): string {
    return moment(date, 'YYYY-MM-DD', true) //This line will read stored date, true is docs "strict mode", fake dates will return invalid date
        .locale(locale === 'ms' ? 'ms' : 'en') //locale set the language for this date, default is english
        .format(pattern)
}