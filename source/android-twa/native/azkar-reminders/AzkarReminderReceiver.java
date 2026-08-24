package com.qiblalabs.azkar;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.qiblalabs.R;

public final class AzkarReminderReceiver extends BroadcastReceiver {
    private static final int NOTIFICATION_ID = 7124;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!AzkarReminderScheduler.isEnabled(context)) return;
        String phraseId = AzkarReminderScheduler.phraseId(context);
        String phraseText = AzkarReminderScheduler.phraseText(context);
        int rawId = rawForPhrase(context, phraseId);
        String channelId = "azkar_" + phraseId + "_v1";
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                        channelId,
                        context.getString(R.string.azkar_channel_name),
                        NotificationManager.IMPORTANCE_HIGH);
                channel.setDescription(context.getString(R.string.azkar_channel_description));
                if (rawId != 0) {
                    Uri sound = Uri.parse("android.resource://" + context.getPackageName() + "/" + rawId);
                    AudioAttributes attrs = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build();
                    channel.setSound(sound, attrs);
                }
                manager.createNotificationChannel(channel);
            }
            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                    .setSmallIcon(context.getApplicationInfo().icon)
                    .setContentTitle(context.getString(R.string.azkar_notification_title))
                    .setContentText(phraseText)
                    .setAutoCancel(true)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setContentIntent(openAppIntent(context));
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O && rawId != 0) {
                builder.setSound(Uri.parse("android.resource://" + context.getPackageName() + "/" + rawId));
            }
            manager.notify(NOTIFICATION_ID, builder.build());
        }
        AzkarReminderScheduler.scheduleNext(context, AzkarReminderScheduler.intervalMinutes(context));
    }

    private PendingIntent openAppIntent(Context context) {
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) launch = new Intent();
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context, 7125, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private int rawForPhrase(Context context, String phraseId) {
        String resource;
        switch (phraseId) {
            case "alhamdulillah": resource = "azkar_alhamdulillah"; break;
            case "allahuakbar": resource = "azkar_allahuakbar"; break;
            case "lailahaillallah": resource = "azkar_lailahaillallah"; break;
            case "astaghfirullah": resource = "azkar_astaghfirullah"; break;
            case "astaghfirullahalazim": resource = "azkar_astaghfirullahalazim"; break;
            case "subhanallahwabihamdih": resource = "azkar_subhanallahwabihamdih"; break;
            case "lahawla": resource = "azkar_lahawla"; break;
            case "hasbiyallah": resource = "azkar_hasbiyallah"; break;
            case "salat": resource = "azkar_salat"; break;
            default: resource = "azkar_subhanallah"; break;
        }
        return context.getResources().getIdentifier(resource, "raw", context.getPackageName());
    }
}
