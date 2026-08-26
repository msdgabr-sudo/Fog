package com.qiblalabs.nativebridge;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import java.util.Calendar;
import java.util.TimeZone;

public final class PrayerNativeScheduler {
    public static final String PREFS = "qiblaastro_prayer_native";
    public static final String[] IDS = {"fajr","dhuhr","asr","maghrib","isha"};
    static final String KEY_PLAN = "plan_v1";
    static final String KEY_EXACT_PROMPTED = "exact_access_prompted";
    static final int BASE_REQ = 8400;
    static final int PRE_REQ = 8450;
    static final int BACKUP_REQ = 8500;
    private PrayerNativeScheduler() {}

    public static final class NextPrayer {
        public final String id;
        public final int index;
        public final long atMillis;

        NextPrayer(String id, int index, long atMillis) {
            this.id = id;
            this.index = index;
            this.atMillis = atMillis;
        }
    }

    public static void reschedule(Context context) {
        cancelAll(context);
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!p.getBoolean("enabled", false)) return;
        String tzId = p.getString("timezone", TimeZone.getDefault().getID());
        TimeZone tz = TimeZone.getTimeZone(tzId == null ? TimeZone.getDefault().getID() : tzId);
        long now = System.currentTimeMillis();
        int advance = Math.max(0, Math.min(30, p.getInt("advance", 0)));
        String plan = p.getString(KEY_PLAN, "");
        boolean dateStamped = plan != null && !plan.isEmpty();
        for (int i=0;i<IDS.length;i++) {
            String id = IDS[i];
            String mode = p.getString("mode_"+id, "off");
            if ("off".equals(mode)) continue;
            long actual;
            if (dateStamped) {
                actual = nextPlannedOccurrence(plan, i, now, tz);
                if (actual <= 0L) continue;
            } else {
                int minute = p.getInt("time_"+id, -1);
                if (minute < 0 || minute >= 1440) continue;
                actual = nextOccurrence(now, minute, tz);
            }
            scheduleOne(context, BASE_REQ+i, id, mode, false, actual, true);
            if (advance > 0) {
                long pre = actual - advance*60_000L;
                // Keep the user-selected prayer itself exact. The optional advance
                // notice is idle-safe but inexact so it cannot consume the exact
                // alarm quota shortly before the actual prayer event.
                if (pre > now + 5000L) scheduleOne(context, PRE_REQ+i, id, "notification", true, pre, false);
            }
        }
    }

    public static boolean canScheduleExact(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return false;
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms();
    }

    /** Returns the next local prayer display event without doing any calculation. */
    public static NextPrayer nextPrayer(SharedPreferences p, long now) {
        String tzId = p.getString("timezone", TimeZone.getDefault().getID());
        TimeZone tz = TimeZone.getTimeZone(tzId == null ? TimeZone.getDefault().getID() : tzId);
        String plan = p.getString(KEY_PLAN, "");
        boolean dateStamped = plan != null && !plan.isEmpty();
        long best = Long.MAX_VALUE;
        int bestIndex = -1;
        for (int i = 0; i < IDS.length; i++) {
            long candidate;
            if (dateStamped) {
                candidate = nextPlannedOccurrence(plan, i, now, tz);
            } else {
                int minute = p.getInt("time_" + IDS[i], -1);
                if (minute < 0 || minute >= 1440) continue;
                candidate = nextOccurrence(now, minute, tz);
            }
            if (candidate > now && candidate < best) {
                best = candidate;
                bestIndex = i;
            }
        }
        return bestIndex < 0 ? null : new NextPrayer(IDS[bestIndex], bestIndex, best);
    }

    private static long nextPlannedOccurrence(String plan, int prayerIndex, long now, TimeZone tz) {
        long best = Long.MAX_VALUE;
        String[] days = plan.split("\\|");
        for (String day : days) {
            String[] pair = day.split(":", 2);
            if (pair.length != 2) continue;
            String[] ymd = pair[0].split("-");
            String[] mins = pair[1].split(",");
            if (ymd.length != 3 || mins.length != IDS.length || prayerIndex < 0 || prayerIndex >= mins.length) continue;
            try {
                int year = Integer.parseInt(ymd[0]);
                int month = Integer.parseInt(ymd[1]);
                int date = Integer.parseInt(ymd[2]);
                int minute = Integer.parseInt(mins[prayerIndex]);
                if (minute < 0 || minute >= 1440) continue;
                Calendar dateCheck = Calendar.getInstance(tz);
                dateCheck.clear();
                dateCheck.setLenient(false);
                dateCheck.set(year, month-1, date, 12, 0, 0);
                dateCheck.getTimeInMillis();
                Calendar c = Calendar.getInstance(tz);
                c.clear();
                // Calendar normalizes the rare daylight-saving gap instead of
                // silently dropping a valid date-stamped prayer from the plan.
                c.setLenient(true);
                c.set(year, month-1, date, minute/60, minute%60, 0);
                long candidate = c.getTimeInMillis();
                if (candidate > now && candidate < best) best = candidate;
            } catch (Exception ignored) {}
        }
        return best == Long.MAX_VALUE ? -1L : best;
    }

    private static long nextOccurrence(long baseMillis, int minuteOfDay, TimeZone tz) {
        Calendar c = Calendar.getInstance(tz);
        c.setTimeInMillis(baseMillis);
        c.set(Calendar.HOUR_OF_DAY, minuteOfDay/60);
        c.set(Calendar.MINUTE, minuteOfDay%60);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        if (c.getTimeInMillis() <= baseMillis) c.add(Calendar.DAY_OF_MONTH, 1);
        return c.getTimeInMillis();
    }

    private static void scheduleOne(Context context, int requestCode, String id, String mode, boolean pre, long at, boolean exactPrayer) {
        AlarmManager am=(AlarmManager)context.getSystemService(Context.ALARM_SERVICE);
        if(am==null)return;
        Intent in=new Intent(context, PrayerNotificationReceiver.class)
                .setAction("com.qiblalabs.PRAYER_NATIVE_"+(pre?"PRE_":"")+id)
                .putExtra("prayer",id).putExtra("mode",mode).putExtra("pre",pre)
                .putExtra("scheduled_at",at);
        PendingIntent pi=PendingIntent.getBroadcast(context,requestCode,in,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        if (exactPrayer && canScheduleExact(context)) {
            try {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
                int index=requestCode-BASE_REQ;
                Intent backupIntent=new Intent(context,PrayerNotificationReceiver.class)
                        .setAction("com.qiblalabs.PRAYER_NATIVE_BACKUP_"+id)
                        .putExtra("prayer",id).putExtra("mode",mode).putExtra("pre",false)
                        .putExtra("backup",true).putExtra("scheduled_at",at);
                PendingIntent backup=PendingIntent.getBroadcast(context,BACKUP_REQ+index,backupIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
                // This normally gets cancelled by the exact delivery. It remains
                // as a safe approximate path if special access is later revoked,
                // because Android removes pending exact alarms on revocation.
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,backup);
                return;
            } catch (SecurityException ignored) {
                // Special access can be revoked between the capability check
                // and this call. Preserve an inexact, idle-safe delivery path.
            }
        }
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);
    }

    public static void cancelAll(Context context) {
        AlarmManager am=(AlarmManager)context.getSystemService(Context.ALARM_SERVICE);
        if(am==null)return;
        for(int i=0;i<IDS.length;i++){
            cancel(context,am,BASE_REQ+i,"com.qiblalabs.PRAYER_NATIVE_"+IDS[i]);
            cancel(context,am,PRE_REQ+i,"com.qiblalabs.PRAYER_NATIVE_PRE_"+IDS[i]);
            cancel(context,am,BACKUP_REQ+i,"com.qiblalabs.PRAYER_NATIVE_BACKUP_"+IDS[i]);
        }
    }
    private static void cancel(Context context, AlarmManager am, int requestCode, String action){
        Intent in=new Intent(context,PrayerNotificationReceiver.class).setAction(action);
        PendingIntent pi=PendingIntent.getBroadcast(context,requestCode,in,PendingIntent.FLAG_NO_CREATE|PendingIntent.FLAG_IMMUTABLE);
        if(pi!=null)am.cancel(pi);
    }
}
