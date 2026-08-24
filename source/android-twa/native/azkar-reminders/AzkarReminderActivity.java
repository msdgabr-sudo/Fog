package com.qiblalabs.azkar;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.widget.Toast;

import com.qiblalabs.R;
import com.qiblalabs.nativebridge.NativeBridgeToken;

/** User-initiated and per-install-authenticated bridge from the TWA into native Azkar reminders. */
public final class AzkarReminderActivity extends Activity {
    private static final int REQ_NOTIFICATIONS = 7126;
    private static final int MIN_INTERVAL_MINUTES = 5;
    private static final int MAX_INTERVAL_MINUTES = 1440;

    private int pendingInterval = 10;
    private String pendingPhrase = "subhanallah";
    private String pendingText = "ذكر الله";

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Uri data = getIntent() != null ? getIntent().getData() : null;
        if (!isExpectedBridgeUri(data) || !NativeBridgeToken.valid(this, data.getQueryParameter("token"))) { finish(); return; }
        String mode = data.getQueryParameter("mode");
        if ("stop".equals(mode)) {
            AzkarReminderScheduler.stop(this);
            Toast.makeText(this, R.string.azkar_stopped_toast, Toast.LENGTH_SHORT).show();
            finish();
            return;
        }
        if (!"start".equals(mode)) { finish(); return; }
        pendingInterval = parseInterval(data.getQueryParameter("interval"));
        pendingPhrase = AzkarReminderScheduler.sanitizePhrase(data.getQueryParameter("phrase"));
        pendingText = safePhraseText(pendingPhrase);
        requestPermissionThenStart();
    }

    private boolean isExpectedBridgeUri(Uri data) { return data != null && "qiblaastro".equals(data.getScheme()) && "azkar-reminder".equals(data.getHost()); }

    private void requestPermissionThenStart() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFICATIONS);
            return;
        }
        startNativeReminder();
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQ_NOTIFICATIONS) return;
        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) startNativeReminder();
        else { Toast.makeText(this, R.string.azkar_permission_required, Toast.LENGTH_LONG).show(); finish(); }
    }

    private void startNativeReminder() {
        AzkarReminderScheduler.start(this, pendingInterval, pendingPhrase, pendingText);
        Toast.makeText(this, R.string.azkar_started_toast, Toast.LENGTH_SHORT).show();
        finish();
    }

    private int parseInterval(String value) {
        try { int parsed = Integer.parseInt(value); return Math.max(MIN_INTERVAL_MINUTES, Math.min(MAX_INTERVAL_MINUTES, parsed)); }
        catch (Exception ignored) { return MIN_INTERVAL_MINUTES; }
    }

    private String safePhraseText(String phrase) {
        if ("alhamdulillah".equals(phrase)) return "الحمد لله";
        if ("allahuakbar".equals(phrase)) return "الله أكبر";
        if ("lailahaillallah".equals(phrase)) return "لا إله إلا الله";
        if ("astaghfirullah".equals(phrase)) return "أستغفر الله";
        if ("astaghfirullahalazim".equals(phrase)) return "أستغفر الله العظيم";
        if ("subhanallahwabihamdih".equals(phrase)) return "سبحان الله وبحمده";
        if ("lahawla".equals(phrase)) return "لا حول ولا قوة إلا بالله";
        if ("hasbiyallah".equals(phrase)) return "حسبي الله";
        if ("salat".equals(phrase)) return "اللهم صل وسلم على نبينا محمد";
        return "سبحان الله";
    }
}
