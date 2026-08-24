package com.qiblalabs.nativebridge;

import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

import com.qiblalabs.widget.QiblaWidgetProvider;

public final class PrayerBootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent){
        String a=intent!=null?intent.getAction():"";
        if(!Intent.ACTION_BOOT_COMPLETED.equals(a)&&!Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)&&!Intent.ACTION_TIMEZONE_CHANGED.equals(a)&&!Intent.ACTION_TIME_CHANGED.equals(a))return;
        PrayerNativeScheduler.reschedule(context);
        AppWidgetManager m=AppWidgetManager.getInstance(context);
        int[] ids=m.getAppWidgetIds(new ComponentName(context,QiblaWidgetProvider.class));
        if(ids.length>0)new QiblaWidgetProvider().onUpdate(context,m,ids);
    }
}
