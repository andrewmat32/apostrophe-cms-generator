/**
 * Code Generator
 * Generate Apostrophe modules with templates or AI assistance
 */

let selectedProject = null;
let generatedFiles = [];
let selectedModuleType = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Use the cool page-loader (not the modal) for initial load
    // The page-loader is already visible from HTML

    try {
        // Load projects
        await loadProjects();

        // Load history
        await loadHistory();

        // Initialize wizard
        if (typeof initWizard === 'function') {
            initWizard();
        }

        // Everything loaded - hide the cool page loader
        setTimeout(() => {
            const loader = document.getElementById('page-loader');
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.style.display = 'none';
                }, 600);
            }
        }, 200);
    } catch (error) {
        console.error('Error during initialization:', error);
        // Hide loader on error too
        const loader = document.getElementById('page-loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 600);
        }
    }
});


/**
 * Load available projects
 */
async function loadProjects() {
    try {
        const response = await fetch('/api/code-generator/projects');
        const projects = await response.json();

        const wizardDropdown = document.getElementById('wizard-project-dropdown');
        if (wizardDropdown) {
            wizardDropdown.innerHTML = '<option value="" class="bg-gray-800 text-white">Choose a project...</option>' +
                projects.map(project => `
                    <option value="${project.id}" class="bg-gray-800 text-white">${project.name}</option>
                `).join('');
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        const wizardDropdown = document.getElementById('wizard-project-dropdown');
        if (wizardDropdown) {
            wizardDropdown.innerHTML = '<option value="" class="bg-gray-800 text-white">Error loading projects</option>';
            wizardDropdown.disabled = true;
        }
    }
}


/**
 * Loading modal helper functions
 */
let completedSteps = [];
let lastStage = null;
let lastMessage = null;

function showLoadingModal() {
    document.getElementById('loading-modal').classList.remove('hidden');
    completedSteps = [];
    lastStage = null;
    lastMessage = null;
    document.getElementById('steps-timeline').innerHTML = '';

    // Show the spinner (in case it was hidden from previous generation)
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.classList.remove('hidden');
    }
}

function hideLoadingModal() {
    document.getElementById('loading-modal').classList.add('hidden');
}

/**
 * Show generated files (called from Show Files button in loader)
 */
function showGeneratedFiles() {
    // Hide loading modal
    hideLoadingModal();

    // Hide wizard interface
    const wizardInterface = document.getElementById('wizard-interface');
    if (wizardInterface) {
        wizardInterface.classList.add('hidden');
    }

    // Show results with dark theme styling
    const results = document.getElementById('results');
    results.classList.remove('hidden');

    // Apply dark theme to results
    results.className = 'fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-purple-900 overflow-y-auto p-8';
    results.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
    results.style.zIndex = '30';

    // Wrap all content in a centered container WITHOUT clearing innerHTML
    if (!results.querySelector('.results-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'results-wrapper max-w-5xl mx-auto';

        // Move ALL children into wrapper
        while (results.firstChild) {
            wrapper.appendChild(results.firstChild);
        }

        results.appendChild(wrapper);
    }

    // Style the title for dark mode
    const title = results.querySelector('h2');
    if (title) {
        title.className = 'text-2xl font-bold text-white mb-6';
    }

    // Style all sections for dark mode visibility
    const mainSections = results.querySelectorAll('.bg-white');
    mainSections.forEach(section => {
        section.style.backgroundColor = '#ffffff';
    });

    // Code preview backgrounds (keep dark)
    const codeBlocks = results.querySelectorAll('pre.bg-gray-900');
    codeBlocks.forEach(block => {
        block.style.backgroundColor = '#111827';
    });

    // Style buttons for dark mode
    const saveBtn = results.querySelector('[onclick="saveFiles()"]');
    if (saveBtn) {
        saveBtn.className = 'bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors font-semibold';
    }

    const deleteBtn = results.querySelector('[onclick="deleteFromProject()"]');
    if (deleteBtn) {
        deleteBtn.className = 'bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors font-semibold hidden';
    }

    const copyBtn = results.querySelector('[onclick="copyToClipboard()"]');
    if (copyBtn) {
        copyBtn.className = 'px-6 py-2 bg-white/10 border-2 border-white/20 rounded-lg hover:bg-white/20 transition-colors text-white font-semibold';
    }

    const resetBtn = results.querySelector('[onclick="resetForm()"]');
    if (resetBtn) {
        resetBtn.className = 'px-6 py-2 bg-white/10 border-2 border-white/20 rounded-lg hover:bg-white/20 transition-colors text-white font-semibold';
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Hide the Show Files button for next generation
    const showFilesBtn = document.getElementById('show-files-btn');
    if (showFilesBtn) {
        showFilesBtn.classList.add('hidden');
    }
}

function updateLoadingProgress(stage, message, percentage) {
    console.log(`🎨 UI Update: ${stage} - ${message}`);

    // Icon map for stages - use module type icons
    const moduleTypeIcons = {
        'piece': '📝',
        'page': '📄',
        'widget': '🧩',
        'bundle': '📦'
    };

    const iconMap = {
        init: '🚀',
        validating: '✅',
        prompt: '📝',
        claude: moduleTypeIcons[selectedModuleType] || '⚙️',  // Use module type icon
        parsing: '⚙️',
        analyzing: '🔍',
        scss: '🎨',
        complete: '✨'
    };

    // Stage display names (present tense - for current step)
    const stageNames = {
        init: 'Initializing',
        validating: 'Validating',
        prompt: 'Building Prompt',
        claude: 'Calling Claude AI',
        parsing: 'Parsing Response',
        analyzing: 'Analyzing Code',
        scss: 'Generating Styles',
        complete: 'Complete'
    };

    // Completed step names (past tense - for timeline)
    const completedStepNames = {
        init: 'Initialized',
        validating: 'Validated',
        prompt: 'Built Prompt',
        claude: 'Generated',
        parsing: 'Parsed Response',
        analyzing: 'Analyzed Code',
        scss: 'Generated Styles',
        complete: 'Complete'
    };

    const icon = iconMap[stage] || '⚙️';
    const stageName = stageNames[stage] || stage;

    // Update current step display with animation
    const currentStep = document.getElementById('current-step');
    const loadingIcon = document.getElementById('loading-icon');
    const loadingStageText = document.getElementById('loading-stage-text');
    const loadingMessage = document.getElementById('loading-message');

    if (!loadingIcon || !loadingStageText || !loadingMessage) {
        console.error('❌ Loading elements not found!', { loadingIcon, loadingStageText, loadingMessage });
        return;
    }

    console.log(`✅ Updating to: ${icon} ${stageName} - ${message}`);

    // Trigger slide-in animation
    if (currentStep) {
        currentStep.classList.remove('step-enter');
        void currentStep.offsetWidth; // Force reflow
        currentStep.classList.add('step-enter');
    }

    loadingIcon.textContent = icon;
    loadingStageText.textContent = stageName;
    loadingMessage.textContent = message;

    // Add to timeline if stage OR message changed significantly
    const stageChanged = lastStage && lastStage !== stage;
    const messageChanged = lastMessage && lastMessage !== message;

    console.log(`🔍 Timeline check: lastStage=${lastStage}, stage=${stage}, stageChanged=${stageChanged}, messageChanged=${messageChanged}`);

    // For 'claude' stage with different messages (bundle generation), treat each message as a separate step
    if (stage === 'claude' && messageChanged && lastStage === 'claude') {
        console.log(`➕ Adding claude sub-step to timeline: ${lastMessage}`);
        const prevStepKey = `${lastStage}:${lastMessage}`;
        if (!completedSteps.includes(prevStepKey)) {
            completedSteps.push(prevStepKey);
            // Convert message to past tense: "Generating X" -> "Generated X"
            const completedMessage = lastMessage.replace('Generating', 'Generated');
            addStepToTimeline(lastStage, iconMap[lastStage], completedMessage);
        }
    }
    // Regular stage change (skip 'claude' stage as it should have specific messages)
    else if (stageChanged && !completedSteps.includes(lastStage) && lastStage !== 'claude') {
        console.log(`➕ Adding stage to timeline: ${lastStage} - ${completedStepNames[lastStage]}`);
        completedSteps.push(lastStage);
        addStepToTimeline(lastStage, iconMap[lastStage], completedStepNames[lastStage]);
    }

    // If moving to complete, add the last ongoing step first
    if (stage === 'complete' && lastStage && lastStage !== 'complete') {
        // If last stage was claude with a message, add that specific step
        if (lastStage === 'claude' && lastMessage) {
            const lastStepKey = `${lastStage}:${lastMessage}`;
            if (!completedSteps.includes(lastStepKey)) {
                console.log(`➕ Adding final claude step to timeline: ${lastMessage}`);
                completedSteps.push(lastStepKey);
                // Convert message to past tense
                const completedMessage = lastMessage.replace('Generating', 'Generated');
                addStepToTimeline(lastStage, iconMap[lastStage], completedMessage);
            }
        }
        // Otherwise add the stage name (but skip 'claude' since it should have a specific message)
        else if (!completedSteps.includes(lastStage) && lastStage !== 'claude') {
            console.log(`➕ Adding final stage to timeline: ${lastStage}`);
            completedSteps.push(lastStage);
            addStepToTimeline(lastStage, iconMap[lastStage], completedStepNames[lastStage]);
        }

        // Show the "Show Files" button
        const showFilesBtn = document.getElementById('show-files-btn');
        if (showFilesBtn) {
            showFilesBtn.classList.remove('hidden');
        }

        // Hide the spinner
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.classList.add('hidden');
        }

        // Add complete step
        if (!completedSteps.includes('complete')) {
            setTimeout(() => {
                completedSteps.push('complete');
                addStepToTimeline('complete', '✨', 'Complete');
            }, 500);
        }
    }

    lastStage = stage;
    lastMessage = message;
}

function addStepToTimeline(stage, icon, name) {
    const timeline = document.getElementById('steps-timeline');
    const stepDiv = document.createElement('div');
    stepDiv.className = 'timeline-step flex items-center gap-3 text-white/80 text-sm py-2 px-3 bg-white/5 rounded-lg';
    stepDiv.innerHTML = `
        <span class="text-xl">${icon}</span>
        <span class="flex-1">${name}</span>
        <span class="text-green-400">✓</span>
    `;
    timeline.appendChild(stepDiv);

    // Auto-scroll timeline to bottom
    timeline.scrollTop = timeline.scrollHeight;
}

/**
 * Generate code with streaming progress (simplified for bundle-only form)
 */
async function generateCode() {
    const name = document.getElementById('module-name').value.trim();
    const label = document.getElementById('module-label').value.trim();
    const description = document.getElementById('module-description').value.trim();
    const includeBemStyles = document.getElementById('include-bem-styles').checked;
    const fullDesign = document.getElementById('full-design').checked;

    // Check if module type is selected
    if (!selectedModuleType) {
        alert('Please select a module type (Piece, Page, Widget, or Bundle)');
        return;
    }

    // Validation
    if (!name) {
        alert('Please enter a name');
        return;
    }

    if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
        alert('Name must be in kebab-case (lowercase with dashes), e.g., my-widget');
        return;
    }

    if (!label) {
        alert('Please enter a label');
        return;
    }

    if (!selectedProject) {
        alert('Please select a project');
        return;
    }

    // Park page validation (if park checkbox is checked)
    let parkPage = false;
    let parkUrl = null;
    const parkCheckbox = document.getElementById('park-page');
    if (parkCheckbox && parkCheckbox.checked) {
        parkPage = true;
        parkUrl = document.getElementById('park-url').value.trim();

        if (!parkUrl) {
            alert('Please enter a park URL when "Park This Page" is checked');
            return;
        }

        if (!parkUrl.startsWith('/')) {
            alert('Park URL must start with / (e.g., /about-us)');
            return;
        }
    }

    // Bundle-specific validation and config
    let bundleConfig = null;
    if (selectedModuleType === 'bundle') {
        const includePiece = document.getElementById('bundle-include-piece').checked;
        const includePage = document.getElementById('bundle-include-page').checked;
        const includeWidget = document.getElementById('bundle-include-widget').checked;

        if (!includePiece && !includePage && !includeWidget) {
            alert('Please select at least one module type for the bundle (Piece, Page, or Widget)');
            return;
        }

        bundleConfig = {
            includePiece,
            includePage,
            includeWidget,
            parkPage,  // Include park page settings in bundle config
            parkUrl
        };
    }

    // Clear any previous results
    clearResults();

    // Disable button
    const generateBtn = event.target;
    const originalText = generateBtn.innerHTML;
    generateBtn.disabled = true;

    // Show loading modal
    showLoadingModal();
    updateLoadingProgress('init', 'Preparing to generate module', 0);

    try {
        // Prepare request payload
        const payload = {
            type: selectedModuleType,
            projectId: selectedProject,
            name,
            label,
            description,
            includeBemStyles,
            fullDesign
        };

        // Add bundle config if it's a bundle
        if (bundleConfig) {
            payload.bundleConfig = bundleConfig;
        }
        // Add park page settings for single page generation
        else if (selectedModuleType === 'page') {
            payload.bundleConfig = {
                parkPage,
                parkUrl
            };
        }

        // Use streaming endpoint with fetch (EventSource doesn't support POST)
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

                        // Debug: Log entire result
                        console.log('📦 Complete result received:', result);
                        console.log('   - files:', result.files?.length, 'files');
                        console.log('   - moduleName:', result.moduleName);
                        console.log('   - moduleType:', result.moduleType);
                        console.log('   - success:', result.success);

                        if (result.files) {
                            result.files.forEach((file, i) => {
                                console.log(`   📄 File ${i+1}: ${file.path}`);
                            });
                        }

                        generatedFiles = result.files || [];

                        // Store module info for saving
                        window.generatedModuleInfo = {
                            moduleName: result.moduleName,
                            moduleType: result.moduleType,
                            includeBemStyles: includeBemStyles,
                            fullDesign: fullDesign,
                            isBundle: result.isBundle,
                            bundleConfig: result.bundleConfig
                        };

                        // Prepare results (but don't show them yet - wait for Show Files button)
                        displayResults(result);

                        // DON'T hide loading modal or show results - user must click "Show Files" button

                        } else if (data.type === 'error') {
                            // Handle error from server
                            console.error('❌ Server error:', data.message);
                            hideLoadingModal();

                            // Show user-friendly error message
                            alert(`⚠️ Generation Failed\n\n${data.message}\n\nPlease try again or adjust your request.`);
                            return; // Stop processing
                        }
                    } catch (jsonError) {
                        console.error('❌ Failed to parse SSE data:', jsonError);
                        console.error('Raw line:', line);
                        // Don't hide modal here - might be a transient parsing issue
                    }
                }
            }
        }

    } catch (error) {
        console.error('Error generating code:', error);
        hideLoadingModal();

        // Show user-friendly error message
        let userMessage = 'Generation Failed';
        let details = error.message;

        if (error.message.includes('timeout')) {
            userMessage = '⏱️ Request Timed Out';
            details = 'Claude API took too long to respond (>60 seconds).\n\nThis usually happens when:\n• Claude API is experiencing high load\n• Your internet connection is slow\n\nPlease try again in a moment.';
        } else if (error.message.includes('Claude CLI')) {
            userMessage = '🔧 Claude CLI Not Found';
            details = 'The Claude CLI is not installed or not in your PATH.\n\nTo fix this:\n1. Install: npm install -g @anthropic-ai/cli\n2. Configure: claude configure\n3. Restart the server';
        } else if (error.message.includes('Project not found')) {
            userMessage = '📁 Project Not Found';
            details = 'The selected project could not be found.\n\nPlease refresh the page and try again.';
        } else if (error.message.includes('429')) {
            userMessage = '🚦 Rate Limit Exceeded';
            details = 'Too many requests to Claude API.\n\nPlease wait a minute and try again.';
        }

        alert(`${userMessage}\n\n${details}`);
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalText;
    }
}

/**
 * Compute page registration info for preview (before saving)
 */
function computePageRegistrationInfo(result) {
    const { moduleType, isBundle, bundleConfig, bundleModules, moduleName } = result;

    // Check if this is a page module
    let isPageModule = moduleType === 'page';
    let pageModuleName = moduleName;

    // For bundles, check if a page is included
    if (isBundle && bundleModules) {
        const pageModule = bundleModules.find(m => m.type === 'page');
        if (pageModule) {
            isPageModule = true;
            pageModuleName = pageModule.name;
        }
    }

    if (!isPageModule) {
        return null;
    }

    // Get park page settings from bundleConfig (set during generation)
    let parkPage = false;
    let parkUrl = null;

    if (bundleConfig) {
        parkPage = bundleConfig.parkPage || false;
        parkUrl = bundleConfig.parkUrl || null;

        // Generate fallback URL only if parking is enabled but URL is missing
        if (parkPage && !parkUrl) {
            parkUrl = '/' + moduleName.replace(/-module$/, '').replace(/-page$/, '');
        }
    }

    const moduleLabel = window.generatedModuleInfo?.moduleLabel || pageModuleName;

    // Return appropriate registration info based on parkPage setting
    if (parkPage && parkUrl) {
        return {
            registrationType: 'park',
            pageModuleName,
            parkUrl,
            moduleLabel,
            isBundle,
            previewCode: `{
  title: '${moduleLabel}',
  slug: '${parkUrl}',
  type: '${pageModuleName}',
  parkedId: '${pageModuleName}'
}`
        };
    } else {
        return {
            registrationType: 'types',
            pageModuleName,
            moduleLabel,
            isBundle,
            previewCode: `{
  name: '${pageModuleName}',
  label: '${moduleLabel}'
}`
        };
    }
}

/**
 * Generate tree view of what will be created
 */
function generateTreeView(result) {
    const moduleName = result.moduleName;
    const moduleType = result.moduleType;

    // Debug logging
    console.log('🌳 generateTreeView called with:', {
        isBundle: result.isBundle,
        isRealBundle: result.isRealBundle,
        bundleModules: result.bundleModules,
        filesCount: result.files?.length
    });

    // Handle bundles
    if (result.isBundle && result.bundleModules) {
        let tree = `📦 Project Root\n├── modules/\n`;

        // Real bundle (piece + widget/page) - nested structure
        if (result.isRealBundle) {
            console.log('📦 Rendering REAL BUNDLE with modules:', result.bundleModules);
            tree += `│   ├── pieces/\n`;
            tree += `│   │   ├── modules.js <span class="text-orange-600">✏️ UPDATED</span>\n`;
            tree += `│   │   └── ${moduleName}-module/ <span class="text-green-600">📁 NEW BUNDLE</span>\n`;
            tree += `│   │       ├── index.js <span class="text-green-600">✅</span> (parent module)\n`;
            tree += `│   │       ├── modules.js <span class="text-green-600">✅</span> (registers internal modules)\n`;

            result.bundleModules.forEach((module, idx) => {
                console.log(`  📁 Processing module ${idx + 1}/${result.bundleModules.length}:`, module);
                const moduleFiles = result.files.filter(f => f.path.includes(`/${module.name}/`));
                console.log(`     Found ${moduleFiles.length} files for ${module.name}`);
                const hasTemplate = moduleFiles.some(f => f.path.includes('/views/'));
                const hasFrontendJs = moduleFiles.some(f => f.path.includes('/ui/src/index.js'));
                const isLast = idx === result.bundleModules.length - 1;
                const prefix = isLast ? '└──' : '├──';

                tree += `│   │       ${prefix} ${module.name}/ <span class="text-blue-600">(${module.type})</span>\n`;

                if (hasTemplate && hasFrontendJs) {
                    // Has both template and JS
                    tree += `│   │       ${isLast ? '    ' : '│   '}├── index.js <span class="text-green-600">✅</span>\n`;
                    tree += `│   │       ${isLast ? '    ' : '│   '}├── views/${module.type === 'widget' ? 'widget.html' : 'page.html'} <span class="text-green-600">✅</span>\n`;
                    tree += `│   │       ${isLast ? '    ' : '│   '}└── ui/src/index.js <span class="text-blue-600">⚡ JS</span>\n`;
                } else if (hasTemplate) {
                    // Has template only
                    tree += `│   │       ${isLast ? '    ' : '│   '}├── index.js <span class="text-green-600">✅</span>\n`;
                    const templateName = module.type === 'widget' ? 'widget.html' : (module.type === 'page' ? 'page.html' : 'show.html');
                    tree += `│   │       ${isLast ? '    ' : '│   '}└── views/${templateName} <span class="text-green-600">✅</span>\n`;
                } else {
                    // No template (piece only)
                    tree += `│   │       ${isLast ? '    ' : '│   '}└── index.js <span class="text-green-600">✅</span>\n`;
                }
            });

            // Show SCSS files if any
            const scssFiles = result.files.filter(f => f.path.endsWith('.scss'));
            if (scssFiles.length > 0) {
                tree += `│   │\n`;
                tree += `│   ├── asset/ui/src/\n`;
                tree += `│       ├── index.scss <span class="text-orange-600">✏️ UPDATED</span>\n`;
                tree += `│       └── scss/\n`;
                scssFiles.forEach((scssFile, idx) => {
                    const fileName = scssFile.path.split('/').pop();
                    const scssSubdir = scssFile.path.includes('/pages/') ? 'pages' : 'components';
                    const isLast = idx === scssFiles.length - 1;
                    const prefix = isLast ? '└──' : '├──';
                    tree += `│           ${prefix} ${scssSubdir}/${fileName} <span class="text-purple-600">🎨</span>\n`;
                });
            }

            // Add page registration info for bundles with pages
            const pageRegInfo = computePageRegistrationInfo(result);
            if (pageRegInfo) {
                tree += `│   │\n`;
                tree += `│   └── @apostrophecms/\n`;
                tree += `│       └── page/\n`;
                tree += `│           └── index.js <span class="text-orange-600">✏️ UPDATED</span>\n`;
                tree += `│               <span class="text-gray-600">options: {</span>\n`;
                if (pageRegInfo.registrationType === 'park') {
                    tree += `│               <span class="text-gray-600">  park: [</span>\n`;
                    tree += `│               <span class="text-green-600">    { title: '${pageRegInfo.moduleLabel}',</span>\n`;
                    tree += `│               <span class="text-green-600">      slug: '${pageRegInfo.parkUrl}',</span>\n`;
                    tree += `│               <span class="text-green-600">      type: '${pageRegInfo.pageModuleName}' } ← Added</span>\n`;
                    tree += `│               <span class="text-gray-600">  ]</span>\n`;
                } else {
                    tree += `│               <span class="text-gray-600">  types: [</span>\n`;
                    tree += `│               <span class="text-green-600">    { name: '${pageRegInfo.pageModuleName}',</span>\n`;
                    tree += `│               <span class="text-green-600">      label: '${pageRegInfo.moduleLabel}' } ← Added</span>\n`;
                    tree += `│               <span class="text-gray-600">  ]</span>\n`;
                }
                tree += `│               <span class="text-gray-600">}</span>\n`;
            }

            return tree;
        } else {
            // Separate modules (widget/page without piece, or just piece)
            // Group modules by type first to avoid duplicates
            const modulesByType = {};
            result.bundleModules.forEach(module => {
                const typeDir = module.type === 'widget' ? 'widgets' :
                               (module.type === 'piece' ? 'pieces' : 'pages');
                if (!modulesByType[typeDir]) {
                    modulesByType[typeDir] = [];
                }
                modulesByType[typeDir].push(module);
            });

            // Render each type directory ONCE with all its modules
            const typeDirs = Object.keys(modulesByType);
            typeDirs.forEach((typeDir, typeDirIdx) => {
                const modules = modulesByType[typeDir];
                const isLastType = typeDirIdx === typeDirs.length - 1;

                tree += `│   ├── ${typeDir}/\n`;
                tree += `│   │   ├── modules.js <span class="text-orange-600">✏️ UPDATED</span>\n`;

                // Render all modules in this type directory
                modules.forEach((module, moduleIdx) => {
                    const isLastModule = moduleIdx === modules.length - 1;
                    const prefix = isLastModule ? '└──' : '├──';
                    const continuation = isLastModule ? '    ' : '│   ';

                    const moduleFiles = result.files.filter(f => f.path.includes(`/${typeDir}/${module.name}/`));
                    const hasTemplate = moduleFiles.some(f => f.path.includes('/views/'));
                    const hasFrontendJs = moduleFiles.some(f => f.path.includes('/ui/src/index.js'));

                    tree += `│   │   ${prefix} ${module.name}/ <span class="text-green-600">📁 NEW ${module.type.toUpperCase()}</span>\n`;

                    if (hasTemplate && hasFrontendJs) {
                        // Has both template and JS
                        tree += `│   │   ${continuation}├── index.js <span class="text-green-600">✅</span>\n`;
                        const templateName = module.type === 'widget' ? 'widget.html' : 'page.html';
                        tree += `│   │   ${continuation}├── views/${templateName} <span class="text-green-600">✅</span>\n`;
                        tree += `│   │   ${continuation}└── ui/src/index.js <span class="text-blue-600">⚡ JS</span>\n`;
                    } else if (hasTemplate) {
                        // Has template only
                        tree += `│   │   ${continuation}├── index.js <span class="text-green-600">✅</span>\n`;
                        const templateName = module.type === 'widget' ? 'widget.html' :
                                           (module.type === 'page' ? 'page.html' : 'show.html');
                        tree += `│   │   ${continuation}└── views/${templateName} <span class="text-green-600">✅</span>\n`;
                    } else {
                        // No template (piece only)
                        tree += `│   │   ${continuation}└── index.js <span class="text-green-600">✅</span>\n`;
                    }
                });

                // Show SCSS files for this type directory (if any)
                const scssSubdir = typeDir === 'pages' ? 'pages' : 'components';
                const scssFiles = result.files.filter(f =>
                    f.path.endsWith('.scss') &&
                    f.path.includes(`/scss/${scssSubdir}/`) &&
                    modules.some(m => f.path.includes(`_${m.name}.scss`))
                );

                if (scssFiles.length > 0 && !isLastType) {
                    tree += `│   │\n`;
                }
            });

            // Show all SCSS files at the end (grouped in asset directory)
            const scssFiles = result.files.filter(f => f.path.endsWith('.scss'));
            if (scssFiles.length > 0) {
                tree += `│   │\n`;
                tree += `│   └── asset/ui/src/\n`;
                tree += `│       ├── index.scss <span class="text-orange-600">✏️ UPDATED</span>\n`;
                tree += `│       └── scss/\n`;

                scssFiles.forEach((scssFile, idx) => {
                    const fileName = scssFile.path.split('/').pop();
                    const scssSubdir = scssFile.path.includes('/pages/') ? 'pages' : 'components';
                    const isLast = idx === scssFiles.length - 1;
                    const prefix = isLast ? '└──' : '├──';
                    tree += `│           ${prefix} ${scssSubdir}/${fileName} <span class="text-purple-600">🎨</span>\n`;
                });
            }
        }

        // Add page registration info for bundles with pages
        const pageRegInfo = computePageRegistrationInfo(result);
        if (pageRegInfo) {
            tree += `│   │\n`;
            tree += `│   └── @apostrophecms/\n`;
            tree += `│       └── page/\n`;
            tree += `│           └── index.js <span class="text-orange-600">✏️ UPDATED</span>\n`;
            tree += `│               <span class="text-gray-600">options: {</span>\n`;
            if (pageRegInfo.registrationType === 'park') {
                tree += `│               <span class="text-gray-600">  park: [</span>\n`;
                tree += `│               <span class="text-green-600">    { title: '${pageRegInfo.moduleLabel}',</span>\n`;
                tree += `│               <span class="text-green-600">      slug: '${pageRegInfo.parkUrl}',</span>\n`;
                tree += `│               <span class="text-green-600">      type: '${pageRegInfo.pageModuleName}' } ← Added</span>\n`;
                tree += `│               <span class="text-gray-600">  ]</span>\n`;
            } else {
                tree += `│               <span class="text-gray-600">  types: [</span>\n`;
                tree += `│               <span class="text-green-600">    { name: '${pageRegInfo.pageModuleName}',</span>\n`;
                tree += `│               <span class="text-green-600">      label: '${pageRegInfo.moduleLabel}' } ← Added</span>\n`;
                tree += `│               <span class="text-gray-600">  ]</span>\n`;
            }
            tree += `│               <span class="text-gray-600">}</span>\n`;
        }

        return tree;
    }

    // Single module
    const hasTemplate = result.files.some(f => f.path.includes('/views/'));
    const hasScss = result.files.some(f => f.path.endsWith('.scss'));
    const typeDir = moduleType === 'widget' ? 'widgets' : (moduleType === 'piece' ? 'pieces' : 'pages');
    const scssSubdir = moduleType === 'page' ? 'pages' : 'components';

    let tree = `📦 Project Root\n`;
    tree += `├── modules/\n`;
    tree += `│   ├── ${typeDir}/\n`;
    tree += `│   │   ├── modules.js <span class="text-orange-600">✏️ UPDATED</span> - Registration added\n`;
    tree += `│   │   │   <span class="text-gray-600">export default {</span>\n`;
    tree += `│   │   │   <span class="text-gray-600">    'existing-module': {},</span>\n`;
    tree += `│   │   │   <span class="text-green-600">    '${moduleName}': {} ← Added</span>\n`;
    tree += `│   │   │   <span class="text-gray-600">};</span>\n`;
    tree += `│   │   │\n`;
    tree += `│   │   └── ${moduleName}/ <span class="text-green-600">📁 NEW</span>\n`;
    tree += `│   │       ├── index.js <span class="text-green-600">✅ CREATED</span>\n`;

    if (hasTemplate) {
        const templateName = moduleType === 'widget' ? 'widget.html' : (moduleType === 'page' ? 'page.html' : 'show.html');
        tree += `│   │       └── views/\n`;
        tree += `│   │           └── ${templateName} <span class="text-green-600">✅ CREATED</span>\n`;
        tree += `│   │\n`;
        tree += `│   └── asset/\n`;
        tree += `│       └── ui/\n`;
        tree += `│           └── src/\n`;
        tree += `│               ├── index.scss <span class="text-orange-600">✏️ UPDATED</span> - Import added\n`;
        tree += `│               │   <span class="text-gray-600">//${scssSubdir === 'pages' ? 'Pages' : 'Components'}</span>\n`;
        tree += `│               │   <span class="text-green-600">@import "./scss/${scssSubdir}/${moduleName}"; ← Added</span>\n`;
        tree += `│               │\n`;
        tree += `│               └── scss/\n`;
        tree += `│                   └── ${scssSubdir}/\n`;
        tree += `│                       └── _${moduleName}.scss <span class="${hasScss ? 'text-purple-600' : 'text-green-600'}">${hasScss ? '🎨 PREVIEW BELOW' : '✅ CREATED'}</span>\n`;
    }

    // Add page registration info for single page modules
    const pageRegInfo = computePageRegistrationInfo(result);
    if (pageRegInfo) {
        tree += `│   │\n`;
        tree += `│   └── @apostrophecms/\n`;
        tree += `│       └── page/\n`;
        tree += `│           └── index.js <span class="text-orange-600">✏️ UPDATED</span>\n`;
        tree += `│               <span class="text-gray-600">options: {</span>\n`;
        if (pageRegInfo.registrationType === 'park') {
            tree += `│               <span class="text-gray-600">  park: [</span>\n`;
            tree += `│               <span class="text-green-600">    { title: '${pageRegInfo.moduleLabel}',</span>\n`;
            tree += `│               <span class="text-green-600">      slug: '${pageRegInfo.parkUrl}',</span>\n`;
            tree += `│               <span class="text-green-600">      type: '${pageRegInfo.pageModuleName}' } ← Added</span>\n`;
            tree += `│               <span class="text-gray-600">  ]</span>\n`;
        } else {
            tree += `│               <span class="text-gray-600">  types: [</span>\n`;
            tree += `│               <span class="text-green-600">    { name: '${pageRegInfo.pageModuleName}',</span>\n`;
            tree += `│               <span class="text-green-600">      label: '${pageRegInfo.moduleLabel}' } ← Added</span>\n`;
            tree += `│               <span class="text-gray-600">  ]</span>\n`;
        }
        tree += `│               <span class="text-gray-600">}</span>\n`;
    }

    return tree;
}

/**
 * Group files by module type for organized preview
 */
function generateGroupedFilePreviews(result) {
    const { files, isBundle, bundleModules } = result;

    let html = '';
    let fileIndex = 0;

    // If it's a bundle, group differently to show internal structure
    if (isBundle) {
        const bundleFiles = {
            wrapper: [],  // index.js, modules.js
            piece: [],
            page: [],
            widget: [],
            scss: []
        };

        files.forEach(file => {
            if (file.path.endsWith('.scss')) {
                bundleFiles.scss.push(file);
            }
            else if (file.path.match(/\/[^/]+-module\/index\.js$/) ||
                     file.path.match(/\/[^/]+-module\/modules\.js$/)) {
                bundleFiles.wrapper.push(file);
            }
            else if (file.path.match(/\/[^/]+-module\/[^/]+\//) && !file.path.includes('-page/') && !file.path.includes('-widget/')) {
                bundleFiles.piece.push(file);
            }
            else if (file.path.includes('-page/')) {
                bundleFiles.page.push(file);
            }
            else if (file.path.includes('-widget/')) {
                bundleFiles.widget.push(file);
            }
        });

        // Render bundle with sub-sections
        return renderBundleWithSubSections(bundleFiles, fileIndex);
    }

    // Non-bundle: use simple grouping
    const fileGroups = {
        piece: [],
        page: [],
        widget: [],
        scss: []
    };

    files.forEach(file => {
        if (file.path.endsWith('.scss')) {
            fileGroups.scss.push(file);
        }
        else if (file.path.includes('/pieces/')) {
            fileGroups.piece.push(file);
        }
        else if (file.path.includes('/pages/')) {
            fileGroups.page.push(file);
        }
        else if (file.path.includes('/widgets/')) {
            fileGroups.widget.push(file);
        }
    });

    // Helper to render a group of files
    const renderGroup = (groupName, groupFiles, icon, color) => {
        if (groupFiles.length === 0) return '';

        const groupId = groupName.toLowerCase().replace(/\s+/g, '-');
        const borderColor = color === 'purple' ? 'border-purple-300' :
                           color === 'blue' ? 'border-blue-300' :
                           color === 'green' ? 'border-green-300' :
                           color === 'orange' ? 'border-orange-300' : 'border-gray-300';
        const bgColor = color === 'purple' ? 'bg-purple-50' :
                       color === 'blue' ? 'bg-blue-50' :
                       color === 'green' ? 'bg-green-50' :
                       color === 'orange' ? 'bg-orange-50' : 'bg-gray-50';
        const textColor = color === 'purple' ? 'text-purple-900' :
                         color === 'blue' ? 'text-blue-900' :
                         color === 'green' ? 'text-green-900' :
                         color === 'orange' ? 'text-orange-900' : 'text-gray-900';

        let groupHtml = `
        <div class="mb-6 bg-white border-2 ${borderColor} rounded-xl overflow-hidden shadow-sm">
            <div class="${bgColor} px-5 py-3 border-b-2 ${borderColor}">
                <div class="font-bold ${textColor} flex items-center gap-3 text-base">
                    <span class="text-2xl">${icon}</span>
                    <span>${groupName}</span>
                    <span class="text-sm font-normal opacity-75">(${groupFiles.length} file${groupFiles.length > 1 ? 's' : ''})</span>
                </div>
            </div>
            <div class="p-4 bg-gray-50/50 space-y-3">
        `;

        groupFiles.forEach(file => {
            const isScss = file.path.endsWith('.scss');
            const isJs = file.path.endsWith('.js');
            const isHtml = file.path.endsWith('.html');

            const fileIcon = isScss ? '🎨' :
                           isJs ? '📜' :
                           isHtml ? '🌐' : '📄';
            const fileBg = isScss ? 'bg-purple-50' : 'bg-gray-50';
            const fileBorder = isScss ? 'border-purple-200' : 'border-gray-200';

            groupHtml += `
            <div class="bg-white border-2 ${fileBorder} rounded-lg overflow-hidden shadow-sm">
                <div class="${fileBg} px-4 py-3 font-mono text-sm font-semibold border-b-2 ${fileBorder} flex items-center justify-between cursor-pointer select-none hover:bg-opacity-80 transition-colors" onclick="toggleSection('file-content-${fileIndex}', 'file-toggle-${fileIndex}')">
                    <div class="flex items-center gap-3">
                        <span id="file-toggle-${fileIndex}" class="text-base transition-transform">▶</span>
                        <span class="text-lg">${fileIcon}</span>
                        <span class="text-sm">${file.path}</span>
                    </div>
                    <button onclick="event.stopPropagation(); copyFileToClipboard(${fileIndex})"
                            class="text-xs bg-white px-3 py-1.5 rounded-md border-2 border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-colors font-semibold">
                        📋 Copy
                    </button>
                </div>
                <div id="file-content-${fileIndex}" class="hidden bg-gray-50">
                    <pre class="p-5 bg-gray-900 text-gray-100 overflow-x-auto text-sm m-3 rounded-lg shadow-inner"><code>${escapeHtml(file.content)}</code></pre>
                </div>
            </div>
            `;
            fileIndex++;
        });

        groupHtml += `
            </div>
        </div>
        `;

        return groupHtml;
    };

    // Render groups in order (no duplicate icons - icon is in the name)
    html += renderGroup('Piece Module', fileGroups.piece, '📝', 'blue');
    html += renderGroup('Page Module', fileGroups.page, '📄', 'green');
    html += renderGroup('Widget Module', fileGroups.widget, '📦', 'gray');
    html += renderGroup('SCSS Styles', fileGroups.scss, '🎨', 'purple');

    return html;
}

/**
 * Render bundle with sub-sections showing internal module organization
 */
function renderBundleWithSubSections(bundleFiles, startIndex) {
    let html = '';
    let fileIndex = startIndex;

    // Helper to render individual file
    const renderFile = (file) => {
        const isScss = file.path.endsWith('.scss');
        const isJs = file.path.endsWith('.js');
        const isHtml = file.path.endsWith('.html');

        const fileIcon = isScss ? '🎨' :
                       isJs ? '📜' :
                       isHtml ? '🌐' : '📄';
        const fileBg = isScss ? 'bg-purple-50' : 'bg-gray-50';
        const fileBorder = isScss ? 'border-purple-200' : 'border-gray-200';

        const fileHtml = `
        <div class="bg-white border-2 ${fileBorder} rounded-lg overflow-hidden shadow-sm">
            <div class="${fileBg} px-4 py-3 font-mono text-sm font-semibold border-b-2 ${fileBorder} flex items-center justify-between cursor-pointer select-none hover:bg-opacity-80 transition-colors" onclick="toggleSection('file-content-${fileIndex}', 'file-toggle-${fileIndex}')">
                <div class="flex items-center gap-3">
                    <span id="file-toggle-${fileIndex}" class="text-base transition-transform">▶</span>
                    <span class="text-lg">${fileIcon}</span>
                    <span class="text-sm">${file.path}</span>
                </div>
                <button onclick="event.stopPropagation(); copyFileToClipboard(${fileIndex})"
                        class="text-xs bg-white px-3 py-1.5 rounded-md border-2 border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-colors font-semibold">
                    📋 Copy
                </button>
            </div>
            <div id="file-content-${fileIndex}" class="hidden bg-gray-50">
                <pre class="p-5 bg-gray-900 text-gray-100 overflow-x-auto text-sm m-3 rounded-lg shadow-inner"><code>${escapeHtml(file.content)}</code></pre>
            </div>
        </div>
        `;
        fileIndex++;
        return fileHtml;
    };

    // Helper to render sub-section
    const renderSubSection = (title, files, icon, indent = false) => {
        if (files.length === 0) return '';

        const indentClass = indent ? 'ml-4' : '';
        let sectionHtml = `
        <div class="${indentClass} mb-3">
            <div class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span>${icon}</span>
                <span>${title}</span>
                <span class="text-xs font-normal opacity-75">(${files.length} file${files.length > 1 ? 's' : ''})</span>
            </div>
            <div class="space-y-2">
        `;

        files.forEach(file => {
            sectionHtml += renderFile(file);
        });

        sectionHtml += `
            </div>
        </div>
        `;

        return sectionHtml;
    };

    // Main bundle container
    html += `
    <div class="mb-6 bg-white border-2 border-orange-300 rounded-xl overflow-hidden shadow-sm">
        <div class="bg-gradient-to-r from-orange-50 to-amber-50 px-5 py-3 border-b-2 border-orange-300">
            <div class="font-bold text-orange-900 flex items-center gap-3 text-base">
                <span class="text-2xl">📦</span>
                <span>Bundle Module</span>
                <span class="text-sm font-normal opacity-75">(${bundleFiles.wrapper.length + bundleFiles.piece.length + bundleFiles.page.length + bundleFiles.widget.length} file${(bundleFiles.wrapper.length + bundleFiles.piece.length + bundleFiles.page.length + bundleFiles.widget.length) > 1 ? 's' : ''})</span>
            </div>
        </div>
        <div class="p-4 bg-orange-50/20 space-y-4">
            ${renderSubSection('Wrapper Files', bundleFiles.wrapper, '📦', false)}
            ${renderSubSection('Piece Module', bundleFiles.piece, '📝', true)}
            ${renderSubSection('Page Module', bundleFiles.page, '📄', true)}
            ${renderSubSection('Widget Module', bundleFiles.widget, '📦', true)}
        </div>
    </div>
    `;

    // SCSS files separate
    if (bundleFiles.scss.length > 0) {
        html += `
        <div class="mb-6 bg-white border-2 border-purple-300 rounded-xl overflow-hidden shadow-sm">
            <div class="bg-gradient-to-r from-purple-50 to-violet-50 px-5 py-3 border-b-2 border-purple-300">
                <div class="font-bold text-purple-900 flex items-center gap-3 text-base">
                    <span class="text-2xl">🎨</span>
                    <span>SCSS Styles</span>
                    <span class="text-sm font-normal opacity-75">(${bundleFiles.scss.length} file${bundleFiles.scss.length > 1 ? 's' : ''})</span>
                </div>
            </div>
            <div class="p-4 bg-purple-50/20 space-y-3">
        `;

        bundleFiles.scss.forEach(file => {
            html += renderFile(file);
        });

        html += `
            </div>
        </div>
        `;
    }

    return html;
}

/**
 * Display generated results
 */
function displayResults(result) {
    console.log('displayResults called with:', result);

    if (!result || !result.files || !result.files.length) {
        console.error('❌ Invalid result object:', result);
        alert('Error: No files generated');
        return;
    }

    const container = document.getElementById('results-content');
    if (!container) {
        console.error('❌ results-content container not found');
        return;
    }

    const treeView = generateTreeView(result);
    console.log('Tree view generated:', treeView.substring(0, 100) + '...');

    // Compute page registration info for preview
    const pageRegInfo = computePageRegistrationInfo(result);

    container.innerHTML = `
        <!-- Success Banner -->
        <div class="p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl mb-6 shadow-sm">
            <div class="flex items-center gap-3 mb-2">
                <div class="flex items-center justify-center w-10 h-10 bg-green-500 rounded-full">
                    <span class="text-white text-xl">✓</span>
                </div>
                <div class="flex-1">
                    <div class="text-lg font-bold text-green-900">Code Generated Successfully</div>
                    <div class="text-sm text-green-700 mt-0.5">
                        ${result.files.length} file(s) ready to save to your project
                    </div>
                </div>
            </div>
        </div>

        ${pageRegInfo ? `
        <!-- Page Registration Preview Banner -->
        <div class="p-5 bg-gradient-to-r from-blue-50 to-sky-50 border-2 border-blue-300 rounded-xl mb-6 shadow-sm">
            <div class="flex items-center gap-3 mb-3">
                <div class="flex items-center justify-center w-10 h-10 ${pageRegInfo.registrationType === 'park' ? 'bg-blue-500' : 'bg-indigo-500'} rounded-full">
                    <span class="text-white text-xl">${pageRegInfo.registrationType === 'park' ? '📍' : '📝'}</span>
                </div>
                <div class="flex-1">
                    <div class="text-lg font-bold ${pageRegInfo.registrationType === 'park' ? 'text-blue-900' : 'text-indigo-900'}">
                        Page Will Be ${pageRegInfo.registrationType === 'park' ? 'Parked' : 'Added to Types'}
                    </div>
                    <div class="text-sm ${pageRegInfo.registrationType === 'park' ? 'text-blue-700' : 'text-indigo-700'} mt-0.5">
                        ${pageRegInfo.registrationType === 'park'
                            ? `Auto-created at <code class="bg-blue-200 px-1 rounded font-mono">${pageRegInfo.parkUrl}</code>`
                            : 'Available for editors to create manually in Page Manager'}
                    </div>
                </div>
            </div>
            <div class="bg-blue-100/50 rounded-lg p-3 border border-blue-200">
                <div class="text-xs font-medium text-blue-800 mb-2">
                    Will be added to <code class="bg-blue-200 px-2 py-0.5 rounded font-mono">modules/@apostrophecms/page/index.js</code> → <code class="bg-blue-200 px-2 py-0.5 rounded font-mono">${pageRegInfo.registrationType}</code> array:
                </div>
                <pre class="text-xs font-mono text-blue-900 leading-relaxed">${pageRegInfo.previewCode}</pre>
            </div>
        </div>
        ` : ''}

        <!-- Tree View Section -->
        <div class="bg-white border-2 border-gray-200 rounded-xl mb-6 shadow-sm overflow-hidden">
            <div class="bg-gradient-to-r from-gray-50 to-slate-50 px-5 py-4 border-b-2 border-gray-200">
                <div class="font-bold text-gray-900 flex items-center gap-2 justify-between cursor-pointer select-none" onclick="toggleSection('tree-view-content', 'tree-view-toggle')">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">🌳</span>
                        <span class="text-lg">What Will Be Created</span>
                    </div>
                    <span id="tree-view-toggle" class="text-lg transition-transform">▶</span>
                </div>
            </div>
            <div id="tree-view-content" class="hidden bg-gray-50">
                <div class="p-5">
                    <pre class="text-sm font-mono leading-relaxed text-gray-800 whitespace-pre-wrap">${treeView}</pre>
                </div>
            </div>
        </div>

        ${result.registrationInfo ? `
        <!-- Page Registration Info -->
        <div class="bg-white border-2 border-blue-300 rounded-xl mb-6 shadow-sm overflow-hidden">
            <div class="bg-gradient-to-r from-blue-50 to-sky-50 px-5 py-4 border-b-2 border-blue-300">
                <div class="font-bold text-blue-900 flex items-center gap-2 text-lg">
                    <span class="text-2xl">${result.registrationInfo.registrationType === 'park' ? '📍' : '📝'}</span>
                    <span>Page Auto-Registration</span>
                </div>
            </div>
            <div class="p-5 bg-blue-50/30">
                <div class="text-sm text-blue-800 mb-3 font-medium">${result.registrationInfo.message}</div>
                <div class="text-sm text-blue-700 mb-2">
                    Added to <code class="bg-blue-100 px-2 py-1 rounded font-mono text-xs">${result.registrationInfo.modulesJsPath}</code>
                    → <code class="bg-blue-100 px-2 py-1 rounded font-mono text-xs">${result.registrationInfo.registrationType}</code> array:
                </div>
                <pre class="p-4 bg-blue-900 text-blue-100 rounded-lg text-xs overflow-x-auto mb-3 shadow-inner"><code>${escapeHtml(result.registrationInfo.registration)}</code></pre>
                ${result.registrationInfo.scssInfo ? `
                <div class="flex items-start gap-3 text-sm text-blue-800 p-3 bg-blue-100 rounded-lg border border-blue-200">
                    <span class="text-2xl">🎨</span>
                    <span class="flex-1">${result.registrationInfo.scssInfo}</span>
                </div>
                ` : ''}
            </div>
        </div>
        ` : ''}

        <!-- Generated Files Section -->
        <div class="bg-white border-2 border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div class="bg-gradient-to-r from-purple-50 to-indigo-50 px-5 py-4 border-b-2 border-gray-200">
                <div class="font-bold text-gray-900 flex items-center gap-3 text-lg">
                    <span class="text-2xl">📄</span>
                    <span>Generated Files Preview</span>
                    <span class="text-sm font-normal text-gray-600">(${result.files.length} files)</span>
                </div>
            </div>
            <div class="p-5 bg-gray-50/50">
                ${generateGroupedFilePreviews(result)}
            </div>
        </div>
    `;

    // History is now saved when user clicks "Save to Project" button
}

/**
 * Save files to project
 */
async function saveFiles() {
    // Use wizard project if selectedProject not set
    const projectId = selectedProject || wizardSelectedProject;

    if (!projectId || !generatedFiles.length) {
        alert('No files to save or no project selected');
        return;
    }

    const saveBtn = event.target;
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '⏳ Saving...';

    try {
        // Get project name from wizard dropdown
        const projectDropdown = document.getElementById('wizard-project-dropdown');
        const projectName = projectDropdown?.options[projectDropdown.selectedIndex]?.text || 'Unknown Project';

        // Get module label from generatedModuleInfo (set during generation)
        const moduleLabel = window.generatedModuleInfo?.moduleLabel || window.generatedModuleInfo?.moduleName;

        // CRITICAL: For bundles, get parkPage/parkUrl from bundleConfig
        // For regular pages, get from V1 form fields
        let parkPage = false;
        let parkUrl = null;

        if (window.generatedModuleInfo?.isBundle && window.generatedModuleInfo?.bundleConfig) {
            // Bundle: respect user's choice for parking
            const bundleHasPage = window.generatedModuleInfo.bundleConfig.includePage;
            if (bundleHasPage) {
                parkPage = window.generatedModuleInfo.bundleConfig.parkPage || false;
                parkUrl = window.generatedModuleInfo.bundleConfig.parkUrl || null;

                // Only generate fallback URL if parkPage is true but URL is missing
                if (parkPage && !parkUrl) {
                    const moduleName = window.generatedModuleInfo.moduleName;
                    parkUrl = '/' + moduleName.replace(/-module$/, '').replace(/-page$/, '');
                    console.warn(`⚠️ No parkUrl in bundleConfig, using fallback: ${parkUrl}`);
                }
                console.log(`📦 Bundle page registration: parkPage=${parkPage}, parkUrl=${parkUrl}`);
            } else {
                console.log(`📦 Bundle without page, no registration needed`);
            }
        } else if (window.generatedModuleInfo?.moduleType === 'page' && window.generatedModuleInfo?.bundleConfig) {
            // Regular page: get park settings from bundleConfig (set during generation)
            parkPage = window.generatedModuleInfo.bundleConfig.parkPage || false;
            parkUrl = window.generatedModuleInfo.bundleConfig.parkUrl || null;
            console.log(`📄 Regular page registration: parkPage=${parkPage}, parkUrl=${parkUrl}`);
        }

        const description = window.generatedModuleInfo?.description || null;

        const response = await fetch('/api/code-generator/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: projectId,
                files: generatedFiles,
                moduleName: window.generatedModuleInfo?.moduleName,
                moduleType: window.generatedModuleInfo?.moduleType,
                moduleLabel: moduleLabel,
                includeBemStyles: window.generatedModuleInfo?.includeBemStyles,
                fullDesign: window.generatedModuleInfo?.fullDesign,
                projectName: projectName,
                isBundle: window.generatedModuleInfo?.isBundle,
                bundleConfig: window.generatedModuleInfo?.bundleConfig,
                parkPage: parkPage,
                parkUrl: parkUrl,
                description: description  // Save the prompt/description
            })
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const result = await response.json();

        const message = result.message || `Successfully saved ${result.savedCount} file(s) to project!`;
        alert(`✓ ${message}`);

        // Show "Delete from Project" button after successful save
        const deleteBtn = document.getElementById('delete-from-project-btn');
        if (deleteBtn) {
            deleteBtn.classList.remove('hidden');
        }

        // Reload history to show the new item
        loadHistory();

        // Note: Don't reset form automatically - user might want to delete

    } catch (error) {
        console.error('Error saving files:', error);

        // Show user-friendly error message
        let userMessage = '💾 Save Failed';
        let details = error.message;

        if (error.message.includes('EACCES') || error.message.includes('permission')) {
            userMessage = '🔒 Permission Denied';
            details = 'Cannot write to project directory.\n\nPlease check:\n• You have write permissions to the project folder\n• The project folder is not read-only\n• No files are locked by another program';
        } else if (error.message.includes('ENOENT')) {
            userMessage = '📁 Directory Not Found';
            details = 'The project directory could not be found.\n\nThe project may have been moved or deleted.\nPlease refresh and select the project again.';
        } else if (error.message.includes('already exists')) {
            userMessage = '⚠️ Module Already Exists';
            details = 'A module with this name already exists in the project.\n\nPlease:\n• Choose a different name, or\n• Manually delete the existing module first';
        }

        alert(`${userMessage}\n\n${details}`);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

/**
 * Delete generated files from project
 */
async function deleteFromProject() {
    // Use wizard project if selectedProject not set
    const projectId = selectedProject || wizardSelectedProject;

    if (!projectId || !generatedFiles.length) {
        alert('No files to delete or no project selected');
        return;
    }

    // Show confirmation dialog
    const moduleName = window.generatedModuleInfo?.moduleName || 'this module';
    const fileCount = generatedFiles.length;
    const confirmMessage = `⚠️ DELETE FROM PROJECT\n\nThis will delete ${fileCount} file(s) that were generated for "${moduleName}".\n\nThis action cannot be undone!\n\nAre you sure you want to continue?`;

    if (!confirm(confirmMessage)) {
        return;
    }

    const deleteBtn = event.target;
    const originalText = deleteBtn.innerHTML;
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '⏳ Deleting...';

    try {
        const response = await fetch('/api/code-generator/delete-from-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: projectId,
                files: generatedFiles,
                moduleName: window.generatedModuleInfo?.moduleName,
                moduleType: window.generatedModuleInfo?.moduleType
            })
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const result = await response.json();

        // Show detailed results
        let message = `✓ ${result.message}\n\n`;
        message += `Deleted Files: ${result.deletedFiles}\n`;
        message += `Removed Empty Directories: ${result.deletedDirectories}\n`;
        message += `Reverted Registrations: ${result.revertedRegistrations || 0}\n`;

        if (result.details?.reverted && result.details.reverted.length > 0) {
            message += `\nReverted:\n${result.details.reverted.map(r => `  • ${r}`).join('\n')}\n`;
        }

        if (result.failedFiles > 0) {
            message += `\n⚠️ Failed to delete ${result.failedFiles} file(s).`;
        }

        alert(message);

        // Hide delete button after successful deletion
        deleteBtn.classList.add('hidden');

        // Reset form after deletion
        setTimeout(() => resetForm(), 1000);

    } catch (error) {
        console.error('Error deleting files from project:', error);

        // Show user-friendly error message
        let userMessage = '🗑️ Delete Failed';
        let details = error.message;

        if (error.message.includes('EACCES') || error.message.includes('permission')) {
            userMessage = '🔒 Permission Denied';
            details = 'Cannot delete files from project directory.\n\nPlease check:\n• You have write permissions to the project folder\n• No files are locked by another program';
        } else if (error.message.includes('ENOENT')) {
            userMessage = '📁 Files Not Found';
            details = 'Some or all files could not be found.\n\nThey may have been already deleted manually.';
        }

        alert(`${userMessage}\n\n${details}`);
    } finally {
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = originalText;
    }
}

/**
 * Copy all code to clipboard
 */
async function copyToClipboard() {
    const allCode = generatedFiles.map(f =>
        `// ${f.path}\n${f.content}`
    ).join('\n\n---\n\n');

    try {
        await navigator.clipboard.writeText(allCode);
        alert('✓ Code copied to clipboard!');
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        alert('Failed to copy to clipboard');
    }
}

/**
 * Copy single file to clipboard
 */
async function copyFileToClipboard(index) {
    const file = generatedFiles[index];

    try {
        await navigator.clipboard.writeText(file.content);
        event.target.textContent = '✓ Copied!';
        setTimeout(() => {
            event.target.textContent = '📋 Copy';
        }, 2000);
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        alert('Failed to copy to clipboard');
    }
}

/**
 * Clear results/previews
 */
function clearResults() {
    // Clear stored files
    generatedFiles = [];

    // Clear module info
    if (window.generatedModuleInfo) {
        window.generatedModuleInfo = null;
    }

    // Hide results section
    const resultsSection = document.getElementById('results');
    if (resultsSection) {
        resultsSection.classList.add('hidden');
    }

    // Clear results content
    const resultsContent = document.getElementById('results-content');
    if (resultsContent) {
        resultsContent.innerHTML = '';
    }
}

/**
 * Reset form and return to wizard step 1
 */
function resetForm() {
    // Reset global state
    selectedProject = null;
    selectedModuleType = null;

    // Reset wizard state
    if (typeof wizardSelectedProject !== 'undefined') {
        wizardSelectedProject = null;
    }
    if (typeof wizardSelectedType !== 'undefined') {
        wizardSelectedType = null;
    }

    // Clear results
    clearResults();

    // Hide delete button
    const deleteBtn = document.getElementById('delete-from-project-btn');
    if (deleteBtn) {
        deleteBtn.classList.add('hidden');
    }

    // Reset wizard dropdown
    const wizardDropdown = document.getElementById('wizard-project-dropdown');
    if (wizardDropdown) {
        wizardDropdown.value = '';
    }

    // Hide project indicator
    const projectIndicator = document.getElementById('wizard-project-indicator');
    if (projectIndicator) {
        projectIndicator.classList.add('hidden');
    }

    // Hide type indicator
    const typeIndicator = document.getElementById('wizard-type-indicator');
    if (typeIndicator) {
        typeIndicator.classList.add('hidden');
    }

    // Reset wizard type cards
    const cards = document.querySelectorAll('.wizard-type-card');
    cards.forEach(card => {
        card.classList.remove('wizard-type-selected');
    });

    // Show wizard interface
    const wizardInterface = document.getElementById('wizard-interface');
    if (wizardInterface) {
        wizardInterface.classList.remove('hidden');
    }

    // Reset wizard to step 1
    if (typeof goToWizardStep === 'function') {
        goToWizardStep(1);
    }

    // Reset next buttons to disabled state
    const nextBtn1 = document.getElementById('wizard-next-1');
    const nextBtn2 = document.getElementById('wizard-next-2');
    if (nextBtn1) nextBtn1.disabled = true;
    if (nextBtn2) nextBtn2.disabled = true;

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Escape HTML for display
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Toggle section visibility (collapse/expand)
 */
function toggleSection(contentId, toggleId) {
    const content = document.getElementById(contentId);
    const toggle = document.getElementById(toggleId);

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        toggle.textContent = '▼';
    } else {
        content.classList.add('hidden');
        toggle.textContent = '▶';
    }
}

/**
 * Auto-fill label from name
 */
document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('module-name');
    const labelInput = document.getElementById('module-label');

    if (nameInput && labelInput) {
        nameInput.addEventListener('input', () => {
            if (!labelInput.value) {
                // Convert kebab-case to Title Case
                const label = nameInput.value
                    .split('-')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                labelInput.value = label;
            }
        });
    }
});


/**
 * History Management
 */
async function loadHistory() {
    try {
        const response = await fetch('/api/code-generator/history');
        const history = await response.json();

        const historySection = document.getElementById('history-section');
        const historyList = document.getElementById('history-list');
        const historyListOverlay = document.getElementById('history-list-overlay');

        if (history.length === 0) {
            if (historySection) historySection.classList.add('hidden');
            if (historyListOverlay) {
                historyListOverlay.innerHTML = '<p class="text-gray-500 text-center py-8">No history items</p>';
            }
            return;
        }

        if (historySection) historySection.classList.remove('hidden');

        const historyHTML = history.map((item) => `
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
                            👁️ View Files
                        </button>
                        <button onclick="loadFromHistory('${item.id}')" class="text-blue-600 hover:text-blue-700 text-sm font-medium">
                            📂 Load
                        </button>
                        <button onclick="deleteHistoryItem('${item.id}')" class="text-red-600 hover:text-red-700 text-sm font-medium">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Update both history lists
        if (historyList) historyList.innerHTML = historyHTML;
        if (historyListOverlay) historyListOverlay.innerHTML = historyHTML;

    } catch (error) {
        console.error('Error loading history:', error);
    }
}

function getBorderColor(type) {
    switch(type) {
        case 'piece': return 'border-blue-500';
        case 'page': return 'border-green-500';
        case 'widget': return 'border-purple-500';
        case 'bundle': return 'border-orange-500';
        default: return 'border-gray-500';
    }
}

function getTypeBadge(type) {
    switch(type) {
        case 'piece': return 'bg-blue-100 text-blue-700';
        case 'page': return 'bg-green-100 text-green-700';
        case 'widget': return 'bg-purple-100 text-purple-700';
        case 'bundle': return 'bg-orange-100 text-orange-700';
        default: return 'bg-gray-100 text-gray-700';
    }
}

// saveToHistory removed - now handled by backend when files are saved

async function loadFromHistory(historyId) {
    try {
        const response = await fetch(`/api/code-generator/history/${historyId}`);
        const item = await response.json();

        if (!item || !item.files || item.files.length === 0) {
            alert('No files found in this history item.');
            return;
        }

        // Store the files globally
        generatedFiles = item.files;

        // Store module info for potential re-saving
        window.generatedModuleInfo = {
            moduleName: item.moduleName,
            moduleType: item.moduleType,
            includeBemStyles: item.includeBemStyles || false,
            fullDesign: item.fullDesign || false,
            isBundle: item.moduleType === 'bundle',
            bundleConfig: item.bundleConfig || null
        };

        // Build result object for display (same format as generation result)
        const result = {
            success: true,
            files: item.files,
            moduleName: item.moduleName,
            moduleType: item.moduleType,
            isBundle: item.moduleType === 'bundle',
            message: `Loaded from history: ${item.moduleName}`
        };

        // Hide wizard interface
        const wizardInterface = document.getElementById('wizard-interface');
        if (wizardInterface) {
            wizardInterface.classList.add('hidden');
        }

        // Display the results
        displayResults(result);

        // Apply dark theme to results (wizard is always dark mode)
        const results = document.getElementById('results');
        results.classList.remove('hidden');
        results.className = 'fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-purple-900 overflow-y-auto p-8';
        results.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
        results.style.zIndex = '30';

        // Wrap content and style for dark mode
        setTimeout(() => {
            if (!results.querySelector('.results-wrapper')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'results-wrapper max-w-5xl mx-auto';

                // Move ALL children into wrapper
                while (results.firstChild) {
                    wrapper.appendChild(results.firstChild);
                }

                results.appendChild(wrapper);
            }

            // Style the title for dark mode
            const title = results.querySelector('h2');
            if (title) {
                title.className = 'text-2xl font-bold text-white mb-6';
            }

            // Apply dark mode styling
            const mainSections = results.querySelectorAll('.bg-white');
            mainSections.forEach(section => {
                section.style.backgroundColor = '#ffffff';
            });

            const codeBlocks = results.querySelectorAll('pre.bg-gray-900');
            codeBlocks.forEach(block => {
                block.style.backgroundColor = '#111827';
            });

            // Style buttons
            const saveBtn = results.querySelector('[onclick="saveFiles()"]');
            if (saveBtn) saveBtn.className = 'bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors font-semibold';

            const deleteBtnEl = results.querySelector('[onclick="deleteFromProject()"]');
            if (deleteBtnEl) deleteBtnEl.className = 'bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors font-semibold hidden';

            const copyBtn = results.querySelector('[onclick="copyToClipboard()"]');
            if (copyBtn) copyBtn.className = 'px-6 py-2 bg-white/10 border-2 border-white/20 rounded-lg hover:bg-white/20 transition-colors text-white font-semibold';

            const resetBtn = results.querySelector('[onclick="resetForm()"]');
            if (resetBtn) resetBtn.className = 'px-6 py-2 bg-white/10 border-2 border-white/20 rounded-lg hover:bg-white/20 transition-colors text-white font-semibold';
        }, 100);

        // When loading from history, HIDE delete button (files might not be in project)
        // User should click "Save to Project" first to restore them
        const deleteBtn = document.getElementById('delete-from-project-btn');
        if (deleteBtn) {
            deleteBtn.classList.add('hidden');
        }

        // Scroll to results
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error('Error loading from history:', error);
        alert('Failed to load from history');
    }
}

async function deleteHistoryItem(historyId) {
    if (!confirm('Delete this history item? This cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/api/code-generator/history/${historyId}`, {
            method: 'DELETE'
        });

        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server returned non-JSON response. Status: ' + response.status);
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete history item');
        }

        const result = await response.json();

        if (result.success) {
            // Reload history to reflect the deletion
            loadHistory();
        } else {
            throw new Error(result.error || 'Failed to delete history item');
        }
    } catch (error) {
        console.error('Error deleting history item:', error);
        alert('Failed to delete: ' + error.message);
    }
}

async function clearAllHistory() {
    if (!confirm('Are you sure you want to delete all generation history? This cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch('/api/code-generator/history', {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            alert('✓ History cleared successfully!');

            // Hide history section
            const historySection = document.getElementById('history-section');
            if (historySection) {
                historySection.classList.add('hidden');
            }

            // Clear history list (main page)
            const historyList = document.getElementById('history-list');
            if (historyList) {
                historyList.innerHTML = '';
            }

            // Clear history overlay list
            const historyListOverlay = document.getElementById('history-list-overlay');
            if (historyListOverlay) {
                historyListOverlay.innerHTML = '<p class="text-gray-500 text-center py-8">No history items</p>';
            }
        } else {
            throw new Error(result.error || 'Failed to clear history');
        }
    } catch (error) {
        console.error('Error clearing history:', error);
        alert('Failed to clear history: ' + error.message);
    }
}

async function viewHistoryFiles(historyId) {
    try {
        const response = await fetch(`/api/code-generator/history/${historyId}`);
        const item = await response.json();

        if (!item || !item.files || item.files.length === 0) {
            alert('No files found in this history item.');
            return;
        }

        // Create modal HTML
        const modalHtml = `
            <div id="history-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="closeHistoryModal(event)">
                <div class="bg-white rounded-xl shadow-2xl p-6 max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h2 class="text-xl font-bold text-gray-900">${item.moduleName}</h2>
                            <p class="text-sm text-gray-600">${item.projectName} • ${new Date(item.timestamp).toLocaleString()}</p>
                        </div>
                        <button onclick="closeHistoryModal()" class="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                    </div>

                    <div class="flex-1 overflow-y-auto">
                        ${generateGroupedFilePreviews({ files: item.files, moduleName: item.moduleName, moduleType: item.moduleType })}
                    </div>

                    <div class="flex gap-3 mt-4 pt-4 border-t">
                        <button onclick="copyHistoryFiles('${historyId}')" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            📋 Copy All Files
                        </button>
                        <button onclick="closeHistoryModal()" class="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer.firstElementChild);
    } catch (error) {
        console.error('Error viewing history files:', error);
        alert('Failed to load history files');
    }
}

function closeHistoryModal(event) {
    // Only close if clicking the backdrop or close button
    if (!event || event.target.id === 'history-modal' || event.type === 'click') {
        const modal = document.getElementById('history-modal');
        if (modal) {
            modal.remove();
        }
    }
}

async function copyHistoryFiles(historyId) {
    try {
        const response = await fetch(`/api/code-generator/history/${historyId}`);
        const item = await response.json();

        if (!item || !item.files) {
            alert('No files found.');
            return;
        }

        const allCode = item.files.map(f =>
            `// ${f.path}\n${f.content}`
        ).join('\n\n---\n\n');

        await navigator.clipboard.writeText(allCode);
        alert('✓ All files copied to clipboard!');
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        alert('Failed to copy to clipboard');
    }
}
