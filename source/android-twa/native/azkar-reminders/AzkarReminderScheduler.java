package com.qiblalabs.azkar;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;

public final class AzkarReminderScheduler {
    static final String PREFS = "qiblaastro_azkar_native";
    static final String KEY_ENABLED = "enabled";
    static final String KEY_INTERVAL = "interval_minutes";
    static final String KEY_PHRASE = "phrase_id";
    static final String KEY_TEXT = "phrase_text";
    static final String KEY_EXACT_PROMPTED = "exact_alarm_prompted";
    static final int REQUEST_CODE = 7124;
    static final int MIN_INTERVAL_MINUTES = 10;

    private AzkarReminderScheduler() {}

    public static void start(Context context, int intervalMinutes, String phraseId, String text) {
        int minutes = Math.max(MIN_INTERVAL_MINUTES, intervalMinutes);
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putBoolean(KEY_ENABLED, true)
                .putInt(KEY_INTERVAL, minutes)
                .putString(KEY_PHRASE, sanitizePhrase(phraseId))
                .putString(KEY_TEXT, text == null ? "ذكر الله" : text)
                .apply();
        scheduleNext(context, minutes);
    }

    public static void stop(Context context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putBoolean(KEY_ENABLED, false)
                .apply();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager != null) alarmManager.cancel(pendingIntent(context));
    }

    public static boolean isEnabled(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_ENABLED, false);
    }

    public static int intervalMinutes(Context context) {
        return Math.max(MIN_INTERVAL_MINUTES, context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getInt(KEY_INTERVAL, 10));
    }

    public static String phraseId(Context context) {
        return sanitizePhrase(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_PHRASE, "subhanallah"));
    }

    public static String phraseText(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_TEXT, "ذكر الله");
    }

    public static boolean canScheduleExact(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return false;
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms();
    }

    public static void scheduleNext(Context context, int intervalMinutes) {
        if (!isEnabled(context)) return;
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;
        long trigger = SystemClock.elapsedRealtime() + Math.max(MIN_INTERVAL_MINUTES, intervalMinutes) * 60_000L;
        PendingIntent operation = pendingIntent(context);
        if (canScheduleExact(context)) {
            try {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, trigger, operation);
                return;
            } catch (SecurityException ignored) {
                // Exact-alarm special access can be revoked between the capability
                // check and scheduling. Preserve an idle-safe inexact fallback.
            }
        }
        alarmManager.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, trigger, operation);
    }

    private static PendingIntent pendingIntent(Context context) {
        Intent intent = new Intent(context, AzkarReminderReceiver.class).setAction("com.qiblalabs.AZKAR_REMINDER");
        return PendingIntent.getBroadcast(context, REQUEST_CODE, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static String sanitizePhrase(String value) {
        if (value == null) return "subhanallah";
        switch (value) {
            case "alhamdulillah":
            case "allahuakbar":
            case "lailahaillallah":
            case "astaghfirullah":
            case "astaghfirullahalazim":
            case "subhanallahwabihamdih":
            case "lahawla":
            case "hasbiyallah":
            case "salat":
            case "subhanallah": return value;
            default: return "subhanallah";
        }
    }
}
