package com.qiblalabs.nativebridge;

import android.net.Uri;

import com.google.androidbrowserhelper.trusted.LauncherActivity;

/** Adds a per-install secret in the URL fragment so it is never sent to the web server/referrer. */
public final class QiblaLauncherActivity extends LauncherActivity {
    @Override
    protected Uri getLaunchingUrl() {
        Uri base = super.getLaunchingUrl();
        String token = NativeBridgeToken.getOrCreate(this);
        return base.buildUpon().fragment("nativeToken=" + Uri.encode(token)).build();
    }
}
