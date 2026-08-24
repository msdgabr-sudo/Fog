package com.qiblalabs.nativebridge;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;

import java.security.SecureRandom;

public final class NativeBridgeToken {
    static final String PREFS = "qiblaastro_native_bridge";
    static final String KEY = "install_token";
    private NativeBridgeToken() {}

    public static String getOrCreate(Context context) {
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String existing = p.getString(KEY, "");
        if (existing != null && existing.length() >= 32) return existing;
        byte[] b = new byte[24];
        new SecureRandom().nextBytes(b);
        String token = Base64.encodeToString(b, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
        p.edit().putString(KEY, token).commit();
        return token;
    }

    public static boolean valid(Context context, String candidate) {
        if (candidate == null || candidate.length() < 32) return false;
        String expected = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "");
        if (expected == null || expected.length() != candidate.length()) return false;
        int diff = 0;
        for (int i = 0; i < expected.length(); i++) diff |= expected.charAt(i) ^ candidate.charAt(i);
        return diff == 0;
    }
}
