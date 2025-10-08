<div class="email-body-preview">
    <div class="mb-4">
        <div class="flex items-center justify-between">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Email Body Preview</h4>
            <div class="flex gap-2">
                <button
                    type="button"
                    class="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                    onclick="toggleEmailView('{{ $getStatePath() }}')"
                    id="toggle-btn-{{ $getStatePath() }}"
                >
                    Show HTML
                </button>
            </div>
        </div>
    </div>

    <!-- Iframe Preview -->
    <iframe
        id="preview-{{ $getStatePath() }}"
        class="border border-gray-300 dark:border-gray-600 rounded-lg w-full"
        style="height: 600px; display: block;"
        srcdoc="{{ htmlspecialchars($getState(), ENT_QUOTES, 'UTF-8') }}"
    ></iframe>

    <!-- Raw HTML Code -->
    <div
        id="source-{{ $getStatePath() }}"
        class="border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 max-h-[600px] overflow-y-auto"
        style="display: none;"
    >
        <pre class="p-4 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ $getState() }}</pre>
    </div>
</div>


<script>
function toggleEmailView(statePath) {
    const preview = document.getElementById(`preview-${statePath}`);
    const source = document.getElementById(`source-${statePath}`);
    const button = document.getElementById(`toggle-btn-${statePath}`);

    if (preview.style.display === 'none') {
        preview.style.display = 'block';
        source.style.display = 'none';
        button.textContent = 'Show HTML';
    } else {
        preview.style.display = 'none';
        source.style.display = 'block';
        button.textContent = 'Show Preview';
    }
}
</script>