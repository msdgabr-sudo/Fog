package com.qiblalabs.nativebridge;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.qiblalabs.R;
import com.qiblalabs.widget.QiblaWidgetProvider;

public final class PrayerNotificationReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        String id=intent!=null?intent.getStringExtra("prayer"):"";
        boolean pre=intent!=null&&intent.getBooleanExtra("pre",false);
        long scheduledAt=intent!=null?intent.getLongExtra("scheduled_at",0L):0L;
        if(indexOf(id)<0)return;
        SharedPreferences p=context.getSharedPreferences(PrayerNativeScheduler.PREFS,Context.MODE_PRIVATE);
        if(!p.getBoolean("enabled",false))return;
        if(Build.VERSION.SDK_INT>=33&&context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED){
            p.edit().putBoolean("enabled",false).apply();
            PrayerNativeScheduler.cancelAll(context);
            return;
        }
        String mode=pre?"notification":p.getString("mode_"+id,"off");
        if("off".equals(mode))return;
        if(!pre&&scheduledAt>0L){
            String deliveredKey="last_delivery_"+id;
            if(p.getLong(deliveredKey,0L)==scheduledAt)return;
            p.edit().putLong(deliveredKey,scheduledAt).apply();
        }
        if(!pre&&"adhan".equals(mode)){
            if(!startAdhan(context,id))showNotice(context,id,false,p);
        }else showNotice(context,id,pre,p);
        PrayerNativeScheduler.reschedule(context);
        QiblaWidgetProvider.refreshAll(context);
    }

    private boolean startAdhan(Context context,String id){
        Intent service=new Intent(context,AdhanPlaybackService.class)
                .setAction(AdhanPlaybackService.ACTION_PLAY)
                .putExtra(AdhanPlaybackService.EXTRA_PRAYER,id);
        try{
            if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.O)context.startForegroundService(service);
            else context.startService(service);
            return true;
        }catch(RuntimeException ignored){return false;}
    }

    private void showNotice(Context c,String id,boolean pre,SharedPreferences p){
        String channel="qiblaastro_prayer_notice_v2";
        NotificationManager nm=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
        if(nm==null)return;
        if(Build.VERSION.SDK_INT>=26){
            NotificationChannel ch=new NotificationChannel(channel,c.getString(R.string.prayer_channel_notice),NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription(c.getString(R.string.prayer_channel_description));
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
        if(pi!=null)b.setContentIntent(pi);
        nm.notify((pre?8700:8600)+indexOf(id),b.build());
    }

    public static String prayerName(Context c,String id){
        if("fajr".equals(id))return c.getString(R.string.prayer_name_fajr);
        if("dhuhr".equals(id))return c.getString(R.string.prayer_name_dhuhr);
        if("asr".equals(id))return c.getString(R.string.prayer_name_asr);
        if("maghrib".equals(id))return c.getString(R.string.prayer_name_maghrib);
        return c.getString(R.string.prayer_name_isha);
    }
    private int indexOf(String id){for(int i=0;i<PrayerNativeScheduler.IDS.length;i++)if(PrayerNativeScheduler.IDS[i].equals(id))return i;return -1;}
}
