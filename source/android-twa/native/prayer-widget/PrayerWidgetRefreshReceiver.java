package com.qiblalabs.nativebridge;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import com.qiblalabs.widget.QiblaWidgetProvider;

/** Refreshes an installed widget only at the next locally stored prayer boundary. */
public final class PrayerWidgetRefreshReceiver extends BroadcastReceiver {
    private static final String ACTION = "com.qiblalabs.action.REFRESH_PRAYER_WIDGET";
    private static final int REQUEST_CODE = 9032;

    @Override public void onReceive(Context context, Intent intent) {
        if (intent == null || !ACTION.equals(intent.getAction())) return;
        QiblaWidgetProvider.refreshAll(context);
    }

    public static void schedule(Context context) {
        cancel(context);
        AppWidgetManager widgets = AppWidgetManager.getInstance(context);
        int[] ids = widgets.getAppWidgetIds(new ComponentName(context, QiblaWidgetProvider.class));
        if (ids.length == 0) return;
        SharedPreferences prefs = context.getSharedPreferences(
                PrayerNativeScheduler.PREFS, Context.MODE_PRIVATE);
        long now = System.currentTimeMillis();
        PrayerNativeScheduler.NextPrayer next = PrayerNativeScheduler.nextPrayer(prefs, now);
        if (next == null) return;
        long trigger = Math.max(now + 5_000L, next.atMillis + 15_000L);
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager != null) {
            manager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP, trigger, pendingIntent(context, PendingIntent.FLAG_UPDATE_CURRENT));
        }
    }

    public static void cancel(Context context) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) return;
        PendingIntent pending = pendingIntent(context, PendingIntent.FLAG_NO_CREATE);
        if (pending != null) manager.cancel(pending);
    }

    private static PendingIntent pendingIntent(Context context, int createFlag) {
        Intent intent = new Intent(context, PrayerWidgetRefreshReceiver.class).setAction(ACTION);
        return PendingIntent.getBroadcast(
                context, REQUEST_CODE, intent, createFlag | PendingIntent.FLAG_IMMUTABLE);
    }
}
