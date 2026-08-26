package com.qiblalabs.azkar;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
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
        if (Build.VERSION.SDK_INT >= 33
                && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            AzkarReminderScheduler.stop(context);
            return;
        }
        String phraseId = AzkarReminderScheduler.phraseId(context);
        String phraseText = AzkarReminderScheduler.phraseText(context);
        int rawId = rawForPhrase(phraseId);
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

    private int rawForPhrase(String phraseId) {
        switch (phraseId) {
            case "alhamdulillah": return R.raw.azkar_alhamdulillah;
            case "allahuakbar": return R.raw.azkar_allahuakbar;
            case "lailahaillallah": return R.raw.azkar_lailahaillallah;
            case "astaghfirullah": return R.raw.azkar_astaghfirullah;
            case "astaghfirullahalazim": return R.raw.azkar_astaghfirullahalazim;
            case "subhanallahwabihamdih": return R.raw.azkar_subhanallahwabihamdih;
            case "lahawla": return R.raw.azkar_lahawla;
            case "hasbiyallah": return R.raw.azkar_hasbiyallah;
            case "salat": return R.raw.azkar_salat;
            default: return R.raw.azkar_subhanallah;
        }
    }
}
