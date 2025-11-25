/**
 * Wizard Mode Logic
 * Stepped interface for code generation
 */

let wizardCurrentStep = 1;
let wizardSelectedProject = null;
let wizardSelectedType = null;

// Initialize wizard
function initWizard() {
    // Reset wizard state
    wizardCurrentStep = 1;
    wizardSelectedProject = null;
    wizardSelectedType = null;

    // Hide module type indicator on init
    const indicator = document.getElementById('wizard-type-indicator');
    if (indicator) {
        indicator.classList.add('hidden');
    }

    goToWizardStep(1);
}

// Navigate to specific step
function goToWizardStep(step) {
    // Hide all steps
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`wizard-step-${i}`).classList.add('hidden');
    }

    // Show target step
    document.getElementById(`wizard-step-${step}`).classList.remove('hidden');
    wizardCurrentStep = step;

    // Update breadcrumbs
    updateBreadcrumbs(step);

    // Project indicator: show on steps 2 and 3 if project is selected
    const projectIndicator = document.getElementById('wizard-project-indicator');
    if (projectIndicator) {
        if (step >= 2 && wizardSelectedProject) {
            projectIndicator.classList.remove('hidden');
        } else {
            projectIndicator.classList.add('hidden');
        }
    }

    // Module type indicator: only show on step 3 if type is selected
    const typeIndicator = document.getElementById('wizard-type-indicator');
    if (typeIndicator) {
        if (step >= 3 && wizardSelectedType) {
            typeIndicator.classList.remove('hidden');
        } else {
            typeIndicator.classList.add('hidden');
        }
    }
}

// Update breadcrumbs
function updateBreadcrumbs(currentStep) {
    const colors = {
        1: '#3b82f6', // Blue for project
        2: getCurrentTypeColor(),
        3: getCurrentTypeColor()
    };

    for (let i = 1; i <= 3; i++) {
        const bread = document.getElementById(`bread-${i}`).querySelector('.wizard-bread');
        const circle = bread.querySelector('.w-8');
        const text = bread.querySelector('span');

        if (i < currentStep) {
            // Completed step
            bread.classList.remove('wizard-bread-inactive', 'wizard-bread-active');
            circle.style.backgroundColor = colors[i];
            text.classList.remove('text-white/40');
            text.classList.add('text-white');
        } else if (i === currentStep) {
            // Current step
            bread.classList.remove('wizard-bread-inactive');
            bread.classList.add('wizard-bread-active');
            circle.style.backgroundColor = colors[i];
            text.classList.remove('text-white/40');
            text.classList.add('text-white');
        } else {
            // Inactive step
            bread.classList.remove('wizard-bread-active');
            bread.classList.add('wizard-bread-inactive');
            circle.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            text.classList.add('text-white/40');
            text.classList.remove('text-white');
        }
    }
}

// Get current type color
function getCurrentTypeColor() {
    const colors = {
        'piece': '#3b82f6',  // Blue
        'page': '#10b981',   // Green
        'widget': '#8b5cf6', // Purple
        'bundle': '#f97316'  // Orange
    };
    return colors[wizardSelectedType] || '#3b82f6';
}

// Next step
function nextWizardStep() {
    if (wizardCurrentStep < 3) {
        goToWizardStep(wizardCurrentStep + 1);
    }
}

// Previous step
function prevWizardStep() {
    if (wizardCurrentStep > 1) {
        goToWizardStep(wizardCurrentStep - 1);
    }
}

// Handle project selection in wizard
document.addEventListener('DOMContentLoaded', () => {
    const wizardDropdown = document.getElementById('wizard-project-dropdown');
    if (wizardDropdown) {
        wizardDropdown.addEventListener('change', (e) => {
            wizardSelectedProject = e.target.value;
            const nextBtn = document.getElementById('wizard-next-1');
            const projectIndicator = document.getElementById('wizard-project-indicator');
            const projectNameSpan = document.getElementById('wizard-project-name');

            if (wizardSelectedProject) {
                nextBtn.disabled = false;
                selectedProject = wizardSelectedProject;

                // Update project indicator
                const selectedOption = e.target.options[e.target.selectedIndex];
                if (projectNameSpan) {
                    projectNameSpan.textContent = selectedOption.textContent;
                }
            } else {
                nextBtn.disabled = true;

                // Hide project indicator if no project selected
                if (projectIndicator) {
                    projectIndicator.classList.add('hidden');
                }
            }
        });
    }
});

// Select module type in wizard
function selectWizardModuleType(type) {
    wizardSelectedType = type;

    // Update UI
    const cards = document.querySelectorAll('.wizard-type-card');
    cards.forEach(card => {
        card.classList.remove('wizard-type-selected');
        if (card.getAttribute('data-type') === type) {
            card.classList.add('wizard-type-selected');
        }
    });

    // Enable next button
    document.getElementById('wizard-next-2').disabled = false;

    // Update step 3 icon and description
    const icons = {
        'piece': '📝',
        'page': '📄',
        'widget': '🧩',
        'bundle': '📦'
    };
    const descriptions = {
        'piece': 'Content type stored in database',
        'page': 'Page type with content areas',
        'widget': 'Reusable UI component',
        'bundle': 'Multiple modules together'
    };
    const typeNames = {
        'piece': 'Piece Module',
        'page': 'Page Module',
        'widget': 'Widget Module',
        'bundle': 'Bundle Module'
    };
    const typeColors = {
        'piece': { from: 'from-blue-500/20', to: 'to-blue-600/20', border: 'border-blue-400/50' },
        'page': { from: 'from-green-500/20', to: 'to-green-600/20', border: 'border-green-400/50' },
        'widget': { from: 'from-purple-500/20', to: 'to-purple-600/20', border: 'border-purple-400/50' },
        'bundle': { from: 'from-orange-500/20', to: 'to-orange-600/20', border: 'border-orange-400/50' }
    };

    // Update module type indicator
    const indicator = document.getElementById('wizard-type-indicator');
    const indicatorIcon = document.getElementById('wizard-type-icon');
    const indicatorName = document.getElementById('wizard-type-name');

    if (indicator && indicatorIcon && indicatorName) {
        indicatorIcon.textContent = icons[type];
        indicatorName.textContent = typeNames[type];

        // Update colors
        indicator.className = `bg-gradient-to-r ${typeColors[type].from} ${typeColors[type].to} border-2 ${typeColors[type].border} backdrop-blur-sm rounded-xl p-3 mb-4`;

        // Show indicator
        indicator.classList.remove('hidden');
    }

    document.getElementById('wizard-step3-icon').textContent = icons[type];
    document.getElementById('wizard-step3-desc').textContent = descriptions[type];

    // Build step 3 form
    buildWizardConfigForm(type);
}

// Build config form for step 3
function buildWizardConfigForm(type) {
    const form = document.getElementById('wizard-config-form');

    let html = `
        <!-- Name and Label on same row -->
        <div class="grid grid-cols-2 gap-2 mb-3">
            <div>
                <label class="block text-xs font-medium text-white mb-1">Name</label>
                <input type="text" id="wizard-module-name" placeholder="my-${type}"
                       class="w-full px-3 py-2 text-sm bg-gray-800 border-2 border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-white placeholder-white/50"
                       ${type === 'bundle' ? 'oninput="updateWizardBundleInfo()"' : ''}>
            </div>
            <div>
                <label class="block text-xs font-medium text-white mb-1">Label</label>
                <input type="text" id="wizard-module-label" placeholder="My ${type.charAt(0).toUpperCase() + type.slice(1)}"
                       class="w-full px-3 py-2 text-sm bg-gray-800 border-2 border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-white placeholder-white/50">
            </div>
        </div>

        <!-- Description -->
        <div class="mb-3">
            <label class="block text-xs font-medium text-white mb-1">Description (Optional)</label>
            <textarea id="wizard-module-description" rows="2" placeholder="Describe what this module does..."
                      class="w-full px-3 py-2 text-sm bg-gray-800 border-2 border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-white placeholder-white/50"></textarea>
        </div>
    `;

    // BEM and Full Design options (for non-piece types) - FULL WIDTH ROW
    if (type !== 'piece') {
        html += `
        <!-- BEM Styles and Full Design on one row -->
        <div class="grid grid-cols-2 gap-3 mb-2">
            <!-- BEM Styles Option -->
            <div class="p-3 bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-2 border-purple-400 rounded-lg shadow-lg">
                <label class="flex items-start gap-2 cursor-pointer select-none group">
                    <input type="checkbox" id="wizard-include-bem" class="mt-0.5 h-4 w-4 rounded accent-purple-400 cursor-pointer" checked onchange="toggleFullDesignAvailability()">
                    <div class="flex-1">
                        <div class="text-sm font-bold text-purple-100 group-hover:text-white transition-colors flex items-center gap-1">
                            <span class="text-lg">🎨</span>
                            <span>BEM Styles</span>
                        </div>
                        <div class="text-xs text-purple-200/90 mt-0.5">SCSS with BEM notation</div>
                    </div>
                </label>
            </div>

            <!-- Full Design Option -->
            <div id="wizard-full-design-wrapper" class="p-3 bg-gradient-to-r from-pink-500/30 to-purple-500/30 border-2 border-pink-400 rounded-lg shadow-lg">
                <label class="flex items-start gap-2 cursor-pointer select-none group">
                    <input type="checkbox" id="wizard-full-design" class="mt-0.5 h-4 w-4 rounded accent-pink-400 cursor-pointer">
                    <div class="flex-1">
                        <div class="text-sm font-bold text-pink-100 group-hover:text-white transition-colors flex items-center gap-1">
                            <span class="text-lg">💎</span>
                            <span>Full Design</span>
                        </div>
                        <div class="text-xs text-pink-200/90 mt-0.5">Production-ready styling</div>
                        <div class="text-xs text-yellow-300/80 mt-0.5 italic">⚡ Requires BEM Styles</div>
                    </div>
                </label>
            </div>
        </div>
        <!-- Experimental Notice -->
        <div class="mb-3 px-2 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p class="text-xs text-yellow-300/90 flex items-center gap-1.5">
                <span>⚠️</span>
                <span><strong>Experimental:</strong> CSS/SCSS generation results may vary. Always review generated styles.</span>
            </p>
        </div>
        `;
    }

    // Bundle options and Park URL side by side
    if (type === 'bundle') {
        html += `
        <!-- What to include + Park URL in one row -->
        <div class="grid grid-cols-2 gap-3 mb-3">
            <!-- What to include -->
            <div class="p-3 bg-orange-900/30 border-2 border-orange-500/40 rounded-lg">
                <label class="block text-xs font-medium text-white mb-2">🎯 What to include:</label>
                <div class="space-y-2">
                    <label class="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-white/5 transition-colors select-none">
                        <input type="checkbox" id="wizard-bundle-piece" class="h-4 w-4 rounded accent-blue-500" onchange="updateWizardBundleInfo()">
                        <span class="text-xs text-white font-medium">📝 Piece</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-white/5 transition-colors select-none">
                        <input type="checkbox" id="wizard-bundle-page" class="h-4 w-4 rounded accent-green-500" onchange="updateWizardBundleInfo(); updateWizardBundleParkOption()">
                        <span class="text-xs text-white font-medium">📄 Page</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-white/5 transition-colors select-none">
                        <input type="checkbox" id="wizard-bundle-widget" class="h-4 w-4 rounded accent-purple-500" onchange="updateWizardBundleInfo()">
                        <span class="text-xs text-white font-medium">🧩 Widget</span>
                    </label>
                </div>
            </div>

            <!-- Park Page option for bundles (shown when page is checked) -->
            <div id="wizard-bundle-park-url" class="p-3 bg-cyan-900/30 border-2 border-cyan-500/40 rounded-lg hidden">
                <label class="flex items-center gap-2 cursor-pointer select-none mb-2">
                    <input type="checkbox" id="wizard-bundle-park-page" class="h-4 w-4 rounded accent-cyan-400" onchange="toggleBundleParkUrl()">
                    <span class="text-xs font-medium text-cyan-200">🅿️ Park This Page</span>
                </label>
                <div id="wizard-bundle-park-url-input" class="hidden">
                    <input type="text" id="wizard-park-url" placeholder="/products"
                           class="w-full px-3 py-2 text-sm bg-gray-900 border-2 border-cyan-400/50 rounded-lg text-white placeholder-cyan-500/50 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30">
                    <div class="text-xs text-cyan-300/80 mt-1.5">Default: <code class="bg-gray-900 px-1 rounded">/{name}s</code></div>
                </div>
                <div class="text-xs text-gray-400 mt-1">Check to auto-create page at startup, uncheck to create manually in CMS</div>
            </div>
        </div>

        <!-- Bundle info (full width) -->
        <div id="wizard-bundle-info" class="mb-3 text-xs text-purple-100 p-2 bg-purple-900/50 rounded hidden border border-purple-500/30">
            <!-- Info will be shown here -->
        </div>
        `;
    } else if (type === 'page') {
        // Park page option - FULL WIDTH for standalone pages
        console.log('✅ Adding park page option for page type');
        html += `
        <!-- Park Page Option (full width) -->
        <div class="mb-3 p-4 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border-2 border-cyan-400 rounded-lg shadow-lg">
            <label class="flex items-start gap-3 cursor-pointer select-none group">
                <input type="checkbox" id="wizard-park-page" class="mt-1 h-5 w-5 rounded accent-cyan-400 cursor-pointer">
                <div class="flex-1">
                    <div class="text-base font-bold text-cyan-100 group-hover:text-white transition-colors flex items-center gap-2">
                        <span class="text-2xl">🅿️</span>
                        <span>Park This Page</span>
                    </div>
                    <div class="text-sm text-cyan-200/90 mt-1">Auto-create page at specific URL (managed in app.js)</div>
                    <div id="wizard-park-url-input" class="mt-3 hidden">
                        <label class="block text-xs font-medium text-cyan-200 mb-1.5">Park URL:</label>
                        <input type="text" id="wizard-park-url" placeholder="/about-us"
                               class="w-full px-3 py-2.5 text-sm bg-gray-900 border-2 border-cyan-400/50 rounded-lg text-white placeholder-cyan-500/50 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30">
                        <div class="text-xs text-cyan-300/80 mt-1.5">Example: /about-us or /contact</div>
                    </div>
                </div>
            </label>
        </div>
        `;
    }

    form.innerHTML = html;

    // DEBUG: Verify park page element exists after HTML is set
    if (type === 'page') {
        console.log('🔍 Checking if park page elements were created...');
        setTimeout(() => {
            const parkCheckbox = document.getElementById('wizard-park-page');
            const parkUrlInput = document.getElementById('wizard-park-url-input');
            console.log('   - Park checkbox found:', !!parkCheckbox);
            console.log('   - Park URL input found:', !!parkUrlInput);
            if (parkCheckbox) {
                console.log('   ✅ Park page elements successfully rendered!');
            } else {
                console.error('   ❌ Park page elements NOT found in DOM!');
            }
        }, 100);
    }

    // Add park page toggle listener
    if (type === 'page') {
        const parkCheckbox = document.getElementById('wizard-park-page');
        const parkUrlInput = document.getElementById('wizard-park-url-input');
        if (parkCheckbox && parkUrlInput) {
            parkCheckbox.addEventListener('change', () => {
                if (parkCheckbox.checked) {
                    parkUrlInput.classList.remove('hidden');
                } else {
                    parkUrlInput.classList.add('hidden');
                }
            });
        }
    }
}

// Update bundle info message
function updateWizardBundleInfo() {
    const hasPiece = document.getElementById('wizard-bundle-piece')?.checked || false;
    const hasPage = document.getElementById('wizard-bundle-page')?.checked || false;
    const hasWidget = document.getElementById('wizard-bundle-widget')?.checked || false;
    const infoDiv = document.getElementById('wizard-bundle-info');

    if (!infoDiv) return;

    if (!hasPiece && !hasPage && !hasWidget) {
        infoDiv.classList.add('hidden');
        return;
    }

    infoDiv.classList.remove('hidden');

    // Get module name if entered
    const moduleName = document.getElementById('wizard-module-name')?.value.trim() || '{name}';

    // Determine bundle structure
    const moduleCount = [hasPiece, hasPage, hasWidget].filter(Boolean).length;
    const isRealBundle = hasPiece && moduleCount > 1;

    if (isRealBundle) {
        // Piece + (Widget and/or Page) = Bundle
        let bundleInfo = `📦 Bundle will be created in <code class="bg-gray-900 text-purple-300 px-2 py-0.5 rounded font-mono text-xs">modules/pieces/${moduleName}-module/</code> with internal modules.js`;


        infoDiv.innerHTML = bundleInfo;
    } else if (hasPiece && moduleCount === 1) {
        // Piece only = Regular piece
        infoDiv.innerHTML = `📝 Single piece will be created in <code class="bg-gray-900 text-purple-300 px-2 py-0.5 rounded font-mono text-xs">modules/pieces/${moduleName}/</code> (not a bundle)`;
    } else {
        // Widget/Page without piece = Separate modules
        let separateInfo = '📁 Modules will be created separately in their respective directories';

        // Add note about parked pages for standalone pages in bundles
        infoDiv.innerHTML = separateInfo;
    }
}

// Toggle park URL field for bundle pages (called when Page checkbox changes)
function updateWizardBundleParkOption() {
    const hasPage = document.getElementById('wizard-bundle-page')?.checked || false;
    const parkOptionDiv = document.getElementById('wizard-bundle-park-url');

    if (!parkOptionDiv) return;

    if (hasPage) {
        parkOptionDiv.classList.remove('hidden');
    } else {
        parkOptionDiv.classList.add('hidden');
    }
}

// Toggle park URL input visibility (called when Park checkbox changes)
function toggleBundleParkUrl() {
    const parkCheckbox = document.getElementById('wizard-bundle-park-page');
    const parkUrlInput = document.getElementById('wizard-bundle-park-url-input');

    if (!parkCheckbox || !parkUrlInput) return;

    if (parkCheckbox.checked) {
        parkUrlInput.classList.remove('hidden');
    } else {
        parkUrlInput.classList.add('hidden');
    }
}

// Toggle Full Design availability based on BEM Styles
function toggleFullDesignAvailability() {
    const bemCheckbox = document.getElementById('wizard-include-bem');
    const fullDesignCheckbox = document.getElementById('wizard-full-design');
    const fullDesignWrapper = document.getElementById('wizard-full-design-wrapper');

    if (!bemCheckbox || !fullDesignCheckbox || !fullDesignWrapper) return;

    const bemEnabled = bemCheckbox.checked;

    // Enable/disable Full Design checkbox
    fullDesignCheckbox.disabled = !bemEnabled;

    if (!bemEnabled) {
        // Uncheck Full Design when BEM is unchecked
        fullDesignCheckbox.checked = false;

        // Add disabled visual state
        fullDesignWrapper.style.opacity = '0.5';
        fullDesignWrapper.style.cursor = 'not-allowed';
        fullDesignWrapper.querySelector('label').style.cursor = 'not-allowed';
    } else {
        // Remove disabled visual state
        fullDesignWrapper.style.opacity = '1';
        fullDesignWrapper.style.cursor = '';
        fullDesignWrapper.querySelector('label').style.cursor = 'pointer';
    }
}

// Generate from wizard
async function generateFromWizard() {
    const name = document.getElementById('wizard-module-name')?.value?.trim();
    const label = document.getElementById('wizard-module-label')?.value?.trim();
    const description = document.getElementById('wizard-module-description')?.value?.trim() || '';

    // Validation
    if (!name || !label) {
        alert('Please fill in name and label');
        return;
    }

    if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
        alert('Name must be in kebab-case (lowercase with dashes)');
        return;
    }

    if (!wizardSelectedProject) {
        alert('Please select a project');
        return;
    }

    // Build config based on type
    let bundleConfig = null;
    const parkPage = document.getElementById('wizard-park-page')?.checked || false;
    let parkUrl = document.getElementById('wizard-park-url')?.value?.trim() || null;

    if (wizardSelectedType === 'bundle') {
        const includePiece = document.getElementById('wizard-bundle-piece')?.checked || false;
        const includePage = document.getElementById('wizard-bundle-page')?.checked || false;
        const includeWidget = document.getElementById('wizard-bundle-widget')?.checked || false;
        const bundleParkPage = document.getElementById('wizard-bundle-park-page')?.checked || false;

        if (!includePiece && !includePage && !includeWidget) {
            alert('Please select at least one module type for the bundle');
            return;
        }

        // Bundle pages can be parked or added to types array (user choice)
        bundleConfig = {
            includePiece,
            includePage,
            includeWidget,
            parkPage: includePage ? bundleParkPage : false,
            parkUrl: (includePage && bundleParkPage) ? (parkUrl || null) : null
        };
    } else if (wizardSelectedType === 'page') {
        // For standalone pages
        if (parkPage && !parkUrl) {
            alert('Please enter a park URL');
            return;
        }
        bundleConfig = {
            parkPage,
            parkUrl
        };
    }

    const includeBemStyles = document.getElementById('wizard-include-bem')?.checked || false;
    const fullDesign = document.getElementById('wizard-full-design')?.checked || false;

    // Validate park URL format if provided
    if (parkUrl && !parkUrl.startsWith('/')) {
        alert('Park URL must start with /');
        return;
    }

    // Clear any previous results
    if (typeof clearResults === 'function') {
        clearResults();
    }

    // Show loading modal
    showLoadingModal();
    updateLoadingProgress('init', 'Preparing to generate module', 0);

    try {
        // Prepare request payload
        const payload = {
            type: wizardSelectedType,
            projectId: wizardSelectedProject,
            name,
            label,
            description,
            includeBemStyles,
            fullDesign
        };

        // Add bundle config if applicable
        if (bundleConfig) {
            payload.bundleConfig = bundleConfig;
        }

        console.log('📤 Sending payload:', payload);

        // Use streaming endpoint
        const response = await fetch('/api/code-generator/generate/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        // Read SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    console.log(`📥 SSE RECEIVED: ${line.substring(0, 100)}...`);
                    try {
                        const data = JSON.parse(line.substring(6));
                        console.log(`📦 SSE PARSED:`, data);

                        if (data.type === 'progress') {
                            console.log(`📊 Progress: ${data.stage} (${data.percentage}%) - ${data.message}`);
                            updateLoadingProgress(data.stage, data.message, data.percentage);
                        } else if (data.type === 'complete') {
                            // Success!
                            const result = data.result;

                            console.log('📦 Complete result received:', result);

                            generatedFiles = result.files || [];

                            // Store module info for saving
                            window.generatedModuleInfo = {
                                moduleName: result.moduleName,
                                moduleType: result.moduleType,
                                moduleLabel: label,
                                description: description,
                                includeBemStyles: includeBemStyles,
                                fullDesign: fullDesign,
                                isBundle: result.isBundle,
                                bundleConfig: bundleConfig || result.bundleConfig
                            };

                            // Display results
                            displayResults(result);

                        } else if (data.type === 'error') {
                            console.error('❌ Server error:', data.message);
                            hideLoadingModal();
                            alert(`⚠️ Generation Failed\n\n${data.message}\n\nPlease try again or adjust your request.`);
                            return;
                        }
                    } catch (jsonError) {
                        console.error('❌ Failed to parse SSE data:', jsonError);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Generation error:', error);
        hideLoadingModal();
        alert(`Error generating module: ${error.message}`);
    }
}

// History overlay toggle
function toggleHistoryOverlay() {
    const overlay = document.getElementById('history-overlay');
    const listContainer = document.getElementById('history-list-overlay');

    if (overlay.classList.contains('hidden')) {
        overlay.classList.remove('hidden');
        // Load history into overlay
        loadHistoryIntoOverlay(listContainer);
    } else {
        overlay.classList.add('hidden');
    }
}

// Load history into overlay
async function loadHistoryIntoOverlay(container) {
    try {
        const response = await fetch('/api/code-generator/history');
        const history = await response.json();

        if (history.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 py-8">No history items yet</div>';
            return;
        }

        container.innerHTML = history.map((item) => `
            <div class="border-l-4 ${getBorderColor(item.moduleType)} bg-gray-50 p-4 rounded-r-lg hover:bg-gray-100 transition-colors">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-semibold text-gray-900">${item.moduleName}</span>
                            <span class="text-xs px-2 py-1 ${getTypeBadge(item.moduleType)} rounded-full">${item.moduleType}</span>
                            ${item.fullDesign ? '<span class="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">💎 Full Design</span>' : ''}
                        </div>
                        <div class="text-sm text-gray-600">${item.projectName} • ${item.fileCount} files</div>
                        ${item.description ? `<div class="text-xs text-gray-700 mt-1 italic">"${item.description}"</div>` : ''}
                        <div class="text-xs text-gray-500 mt-1">${new Date(item.timestamp).toLocaleString()}</div>
                    </div>
                    <div class="flex gap-2 ml-4">
                        <button onclick="viewHistoryFiles('${item.id}')" class="text-purple-600 hover:text-purple-700 text-sm font-medium">
                            👁️ View
                        </button>
                        <button onclick="loadFromHistory('${item.id}'); toggleHistoryOverlay();" class="text-blue-600 hover:text-blue-700 text-sm font-medium">
                            📂 Load
                        </button>
                        <button onclick="deleteHistoryItem('${item.id}')" class="text-red-600 hover:text-red-700 text-sm font-medium">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading history:', error);
        container.innerHTML = '<div class="text-center text-red-500 py-8">Error loading history</div>';
    }
}
