'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MojCalcV8 = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function roundPennies(x) {
    return Math.round(x * 100) / 100;
  }

  function classFor(appointmentType) {
    const text = String(appointmentType || '').toLowerCase();
    let forum = text;
    let hearing = text;
    const pipeIndex = text.indexOf(' | ');
    if (pipeIndex !== -1) {
      forum = text.slice(0, pipeIndex).trim();
      hearing = text.slice(pipeIndex + 3).trim();
    }

    // Professional: case management after first hearing
    if (hearing.includes('case management')) {
      return { cls: 'Professional', classGuessed: false };
    }

    // Community rules
    if (hearing.includes('first hearing')) {
      return { cls: 'Community', classGuessed: false };
    }
    if (hearing.includes('preliminary')) {
      return { cls: 'Community', classGuessed: false };
    }
    if (hearing.includes('plea')) {
      return { cls: 'Community', classGuessed: false };
    }
    if (hearing.includes('mention')) {
      return { cls: 'Community', classGuessed: false };
    }
    if (hearing.includes('bail')) {
      return { cls: 'Community', classGuessed: false };
    }
    if (hearing.includes('supervision') || hearing.includes('induction')) {
      return { cls: 'Community', classGuessed: false };
    }
    if (forum.includes('nps') || forum.includes('probation') || forum.includes('police')) {
      return { cls: 'Community', classGuessed: false };
    }

    // Professional rules
    if (hearing.includes('trial')) {
      return { cls: 'Professional', classGuessed: false };
    }
    if (hearing.includes('evidence')) {
      return { cls: 'Professional', classGuessed: false };
    }
    if (hearing.includes('sentencing')) {
      return { cls: 'Professional', classGuessed: false };
    }
    if (hearing.includes('appeal')) {
      return { cls: 'Professional', classGuessed: false };
    }
    if (hearing.includes('substantive')) {
      return { cls: 'Professional', classGuessed: false };
    }
    if (hearing.includes('full hearing')) {
      return { cls: 'Professional', classGuessed: false };
    }
    if (hearing.includes('legal argument')) {
      return { cls: 'Professional', classGuessed: false };
    }
    if (hearing.includes('ptph')) {
      return { cls: 'Professional', classGuessed: false };
    }
    if (hearing.includes('witness') && (forum.includes('cps') || forum.includes('crown'))) {
      return { cls: 'Professional', classGuessed: false };
    }

    // Children's cases (family) except the first hearing -> Professional
    if (forum.includes('children') && !hearing.includes('first hearing')) {
      return { cls: 'Professional', classGuessed: false };
    }

    // Crown Court trials and PTPH
    if (forum.includes('crown court') && (hearing.includes('trial') || hearing.includes('ptph'))) {
      return { cls: 'Professional', classGuessed: false };
    }

    return { cls: 'Community', classGuessed: true };
  }

  function isOutOfHours(date, bankHoliday, startDateStr) {
    const day = date.getDay();
    if (day === 0 || day === 6) return true;
    if (bankHoliday && date.toDateString() === startDateStr) return true;
    const h = date.getHours();
    return h >= 19 || h < 7;
  }

  function outOfHoursHours(start, end, bankHoliday) {
    if (!(start instanceof Date) || !(end instanceof Date) || end <= start) return 0;
    const startDateStr = start.toDateString();
    let totalMinutes = 0;
    const msPerMinute = 60000;
    for (let t = start.getTime(); t < end.getTime(); t += msPerMinute) {
      const d = new Date(t);
      if (isOutOfHours(d, bankHoliday, startDateStr)) {
        totalMinutes++;
      }
    }
    return totalMinutes / 60;
  }

  function offerValue(input) {
    const {
      delivery,
      appointmentType,
      start,
      end,
      hmcts,
      security,
      bookedHoursBeforeStart,
      bankHoliday,
      oneWayMiles,
      oneWayMinutes,
      cls: providedCls
    } = input || {};

    let cls, classGuessed;
    if (providedCls) {
      cls = providedCls;
      classGuessed = false;
    } else {
      const c = classFor(appointmentType);
      cls = c.cls;
      classGuessed = c.classGuessed;
    }

    const isF2F = delivery === 'F2F';
    const rate = isF2F
      ? (cls === 'Professional' ? 26 : 20)
      : (cls === 'Professional' ? 24 : 18);

    const bookedHours = (end instanceof Date && start instanceof Date && end > start)
      ? (end.getTime() - start.getTime()) / 3600000
      : 0;

    let minimum;
    if (delivery === 'VRI') {
      minimum = 1;
    } else {
      minimum = hmcts ? 2 : 1;
    }

    const raw = Math.max(minimum, bookedHours);
    let rounded = Math.ceil(raw * 4) / 4;
    let billableHours;
    if (bookedHours > 4) {
      billableHours = Math.max(minimum, rounded - 0.5);
    } else {
      billableHours = rounded;
    }

    const base = rate * billableHours;

    let oohHours = 0;
    if (start instanceof Date && end instanceof Date && end > start) {
      oohHours = outOfHoursHours(start, end, bankHoliday);
      oohHours = Math.min(oohHours, billableHours);
    }
    const outOfHours = rate * 0.20 * oohHours;

    let securityUplift = 0;
    if (security === 'SL2' || security === 'SL3' || security === 'SL4') {
      securityUplift = rate * 0.05 * billableHours;
    }

    let urgency = 0;
    if (typeof bookedHoursBeforeStart === 'number' && !isNaN(bookedHoursBeforeStart)) {
      if (bookedHoursBeforeStart <= 3) {
        urgency = rate * 0.30 * billableHours;
      } else if (bookedHoursBeforeStart <= 24) {
        urgency = rate * 0.20 * billableHours;
      }
    }

    const service = base + outOfHours + securityUplift + urgency;

    let travelDistance = 0;
    let travelTime = 0;
    if (isF2F) {
      const miles = Number(oneWayMiles) || 0;
      const minutes = Number(oneWayMinutes) || 0;
      travelDistance = 0.20 * 2 * Math.max(0, Math.min(miles, 200) - 5);
      travelTime = 10 * Math.min(2, 2 * Math.max(0, minutes - 60) / 60);
    }

    const total = service + travelDistance + travelTime;

    return {
      cls,
      classGuessed,
      rate,
      billableHours,
      service: roundPennies(service),
      uplifts: {
        outOfHours: roundPennies(outOfHours),
        security: roundPennies(securityUplift),
        urgency: roundPennies(urgency)
      },
      travelDistance: roundPennies(travelDistance),
      travelTime: roundPennies(travelTime),
      total: roundPennies(total)
    };
  }

  function premium(offerTotal, value) {
    return roundPennies(offerTotal - value.total);
  }

  return { offerValue, premium, classFor };
}));
