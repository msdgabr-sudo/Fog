package com.qiblalabs.azkar;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class AzkarBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (AzkarReminderScheduler.isEnabled(context)) {
            AzkarReminderScheduler.scheduleNext(context, AzkarReminderScheduler.intervalMinutes(context));
        }
    }
}
