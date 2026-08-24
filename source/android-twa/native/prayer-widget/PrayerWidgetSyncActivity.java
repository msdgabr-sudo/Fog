package com.qiblalabs.nativebridge;

import android.Manifest;
import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

import com.qiblalabs.widget.QiblaWidgetProvider;

/** Authenticated first-party bridge. No untrusted payload is accepted without the per-install token. */
public final class PrayerWidgetSyncActivity extends Activity {
    private static final int REQ_NOTIFICATIONS=8711;

    @Override protected void onCreate(Bundle savedInstanceState){
        super.onCreate(savedInstanceState);
        Uri data=getIntent()!=null?getIntent().getData():null;
        if(!expected(data)||!NativeBridgeToken.valid(this,data.getQueryParameter("token"))){finish();return;}
        apply(data);
        if(Build.VERSION.SDK_INT>=33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED && "1".equals(data.getQueryParameter("notify"))){
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},REQ_NOTIFICATIONS);return;
        }
        finish();
    }

    @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] grantResults){
        super.onRequestPermissionsResult(requestCode,permissions,grantResults);
        finish();
    }

    private boolean expected(Uri d){return d!=null&&"qiblaastro".equals(d.getScheme())&&"prayer-sync".equals(d.getHost());}

    private void apply(Uri d){
        SharedPreferences.Editor e=getSharedPreferences(PrayerNativeScheduler.PREFS,Context.MODE_PRIVATE).edit();
        e.putBoolean("enabled","1".equals(d.getQueryParameter("notify")));
        e.putString("city",safeText(d.getQueryParameter("city"),80));
        e.putString("timezone",safeZone(d.getQueryParameter("tz")));
        e.putString("hijri",safeText(d.getQueryParameter("hijri"),80));
        e.putString("qibla",safeQibla(d.getQueryParameter("qibla")));
        e.putInt("advance",boundedInt(d.getQueryParameter("advance"),0,30,0));
        e.putString("profile",safeProfile(d.getQueryParameter("profile")));
        e.putString(PrayerNativeScheduler.KEY_PLAN,safePlan(d.getQueryParameter("plan")));
        String[] ids={"fajr","dhuhr","asr","maghrib","isha"};
        for(String id:ids){
            e.putInt("time_"+id,boundedInt(d.getQueryParameter("t_"+id),0,1439,-1));
            e.putString("mode_"+id,safeMode(d.getQueryParameter("m_"+id)));
        }
        e.putLong("updated_at",System.currentTimeMillis());
        e.apply();
        PrayerNativeScheduler.reschedule(this);
        AppWidgetManager awm=AppWidgetManager.getInstance(this);
        int[] idsWidget=awm.getAppWidgetIds(new ComponentName(this,QiblaWidgetProvider.class));
        if(idsWidget.length>0)new QiblaWidgetProvider().onUpdate(this,awm,idsWidget);
    }

    private int boundedInt(String s,int min,int max,int fallback){try{int v=Integer.parseInt(s);return v<min||v>max?fallback:v;}catch(Exception x){return fallback;}}
    private String safeMode(String s){return "adhan".equals(s)||"notification".equals(s)?s:"off";}
    private String safeProfile(String s){return "calm".equals(s)||"deep".equals(s)?s:"makkah";}
    private String safeText(String s,int max){if(s==null)return "";s=s.replaceAll("[\\p{Cntrl}]","").trim();return s.length()>max?s.substring(0,max):s;}
    private String safeZone(String s){if(s==null||!s.matches("[A-Za-z0-9_+\\-/]{1,64}"))return java.util.TimeZone.getDefault().getID();return s;}
    private String safeQibla(String s){try{double v=Double.parseDouble(s);if(v<0||v>=360)return "";return String.format(java.util.Locale.US,"%.1f",v);}catch(Exception x){return "";}}
    private String safePlan(String raw){
        if(raw==null||raw.isEmpty()||raw.length()>2048)return "";
        String[] days=raw.split("\\|",-1);
        if(days.length<2||days.length>14)return "";
        StringBuilder out=new StringBuilder();
        String previous="";
        for(String day:days){
            String[] pair=day.split(":",2);
            if(pair.length!=2||!pair[0].matches("\\d{4}-\\d{2}-\\d{2}")||(!previous.isEmpty()&&pair[0].compareTo(previous)<=0))return "";
            String[] mins=pair[1].split(",",-1);
            if(mins.length!=5)return "";
            if(out.length()>0)out.append('|');
            out.append(pair[0]).append(':');
            for(int i=0;i<mins.length;i++){
                int minute=boundedInt(mins[i],0,1439,-1);
                if(minute<0)return "";
                if(i>0)out.append(',');
                out.append(minute);
            }
            previous=pair[0];
        }
        return out.toString();
    }
}
