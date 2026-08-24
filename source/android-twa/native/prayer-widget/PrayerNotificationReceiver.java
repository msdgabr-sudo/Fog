package com.qiblalabs.nativebridge;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.qiblalabs.R;
import com.qiblalabs.widget.QiblaWidgetProvider;

public final class PrayerNotificationReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        String id=intent!=null?intent.getStringExtra("prayer"):"";
        String mode=intent!=null?intent.getStringExtra("mode"):"notification";
        boolean pre=intent!=null&&intent.getBooleanExtra("pre",false);
        show(context,id,mode,pre);
        PrayerNativeScheduler.reschedule(context);
        QiblaWidgetProvider.refreshAll(context);
    }

    private void show(Context c,String id,String mode,boolean pre){
        SharedPreferences p=c.getSharedPreferences(PrayerNativeScheduler.PREFS,Context.MODE_PRIVATE);
        boolean adhan=!pre&&"adhan".equals(mode);
        String profile=p.getString("profile","makkah");
        String soundKey="fajr".equals(id)?"fajr":("calm".equals(profile)?"calm":"deep".equals(profile)?"deep":"makkah");
        String channel=adhan?("qiblaastro_prayer_adhan_"+soundKey+"_v1"):"qiblaastro_prayer_notice_v1";
        int rawId=adhan?rawForAdhan(c,soundKey):0;
        Uri sound=rawId==0?null:Uri.parse("android.resource://"+c.getPackageName()+"/"+rawId);
        NotificationManager nm=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
        if(nm==null)return;
        if(Build.VERSION.SDK_INT>=26){
            NotificationChannel ch=new NotificationChannel(channel,c.getString(adhan?R.string.prayer_channel_adhan:R.string.prayer_channel_notice),NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription(c.getString(R.string.prayer_channel_description));
            if(adhan&&sound!=null){AudioAttributes a=new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build();ch.setSound(sound,a);}
            nm.createNotificationChannel(ch);
        }
        Intent launch=c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        PendingIntent pi=launch==null?null:PendingIntent.getActivity(c,8500,launch,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        String name=prayerName(c,id);
        int advance=Math.max(0,p.getInt("advance",0));
        String body=pre?c.getString(R.string.prayer_notification_advance,name,advance):c.getString(R.string.prayer_notification_now,name);
        NotificationCompat.Builder b=new NotificationCompat.Builder(c,channel)
                .setSmallIcon(c.getApplicationInfo().icon)
                .setContentTitle(c.getString(R.string.prayer_notification_title))
                .setContentText(body).setAutoCancel(true).setPriority(NotificationCompat.PRIORITY_HIGH);
        if(Build.VERSION.SDK_INT<26&&adhan&&sound!=null)b.setSound(sound);
        if(pi!=null)b.setContentIntent(pi);
        nm.notify((pre?8700:8600)+indexOf(id),b.build());
    }

    private int rawForAdhan(Context c,String key){
        String r="fajr".equals(key)?"adhan_fajr":"calm".equals(key)?"adhan_ahmed_al_nufais":"deep".equals(key)?"adhan_islam_sobhi":"adhan_mecca";
        return c.getResources().getIdentifier(r,"raw",c.getPackageName());
    }

    public static String prayerName(Context c,String id){
        if("fajr".equals(id))return c.getString(R.string.prayer_name_fajr);
        if("dhuhr".equals(id))return c.getString(R.string.prayer_name_dhuhr);
        if("asr".equals(id))return c.getString(R.string.prayer_name_asr);
        if("maghrib".equals(id))return c.getString(R.string.prayer_name_maghrib);
        return c.getString(R.string.prayer_name_isha);
    }
    private int indexOf(String id){for(int i=0;i<PrayerNativeScheduler.IDS.length;i++)if(PrayerNativeScheduler.IDS[i].equals(id))return i;return 0;}
}
