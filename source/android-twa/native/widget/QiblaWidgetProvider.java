package com.qiblalabs.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import com.qiblalabs.R;
import com.qiblalabs.nativebridge.PrayerNativeScheduler;
import com.qiblalabs.nativebridge.PrayerNotificationReceiver;

/** Read-only widget. Data comes only from the authenticated app-private prayer store. */
public final class QiblaWidgetProvider extends AppWidgetProvider {
    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) manager.updateAppWidget(appWidgetId, buildViews(context));
    }

    public static void refreshAll(Context context){
        AppWidgetManager m=AppWidgetManager.getInstance(context);
        ComponentName c=new ComponentName(context,QiblaWidgetProvider.class);
        int[] ids=m.getAppWidgetIds(c);
        if(ids.length>0)new QiblaWidgetProvider().onUpdate(context,m,ids);
    }

    private RemoteViews buildViews(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PrayerNativeScheduler.PREFS, Context.MODE_PRIVATE);
        String unavailable = context.getString(R.string.widget_value_unavailable);
        String city = prefs.getString("city", context.getString(R.string.widget_city_unavailable));
        String prayer = nextPrayerLabel(context,prefs);
        String prayerTime = nextPrayerTime(prefs);
        String qibla = prefs.getString("qibla", unavailable);
        String hijri = prefs.getString("hijri", unavailable);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.qibla_widget);
        views.setTextViewText(R.id.widget_city, city == null || city.isEmpty() ? context.getString(R.string.widget_city_unavailable) : city);
        views.setTextViewText(R.id.widget_next_prayer, prayer);
        views.setTextViewText(R.id.widget_prayer_time, prayerTime);
        views.setTextViewText(R.id.widget_qibla,
                qibla == null || qibla.isEmpty() || unavailable.equals(qibla)
                        ? context.getString(R.string.widget_qibla_unavailable)
                        : context.getString(R.string.widget_qibla_value, qibla));
        views.setTextViewText(R.id.widget_hijri, hijri == null || hijri.isEmpty() ? unavailable : hijri);
        views.setOnClickPendingIntent(R.id.widget_root, openAppIntent(context));
        return views;
    }

    private String nextPrayerLabel(Context c,SharedPreferences p){
        int idx=nextIndex(p); if(idx<0)return c.getString(R.string.widget_refresh_required);
        return PrayerNotificationReceiver.prayerName(c,PrayerNativeScheduler.IDS[idx]);
    }
    private String nextPrayerTime(SharedPreferences p){
        int idx=nextIndex(p); if(idx<0)return "--:--"; int m=p.getInt("time_"+PrayerNativeScheduler.IDS[idx],-1);
        if(m<0)return "--:--"; int h=m/60,mm=m%60; String ap=h<12?"AM":"PM"; int h12=h%12;if(h12==0)h12=12;
        return String.format(java.util.Locale.getDefault(),"%d:%02d %s",h12,mm,ap);
    }
    private int nextIndex(SharedPreferences p){
        String tz=p.getString("timezone",java.util.TimeZone.getDefault().getID());
        java.util.Calendar c=java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone(tz));
        int now=c.get(java.util.Calendar.HOUR_OF_DAY)*60+c.get(java.util.Calendar.MINUTE);
        for(int i=0;i<PrayerNativeScheduler.IDS.length;i++){int m=p.getInt("time_"+PrayerNativeScheduler.IDS[i],-1);if(m>=now)return i;}
        return 0;
    }

    private PendingIntent openAppIntent(Context context) {
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) launch = new Intent();
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context,9031,launch,PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
