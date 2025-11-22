import { VIDEO_GENERATION } from '../../constants';

export type ViduCapability = 'IMAGE_TO_VIDEO' | 'TEXT_TO_VIDEO' | 'REFERENCE_TO_VIDEO';
export type ResolutionOption = (typeof VIDEO_GENERATION.RESOLUTIONS)[number];

export interface ResolutionPricingDefinition {
    baseCredits: number;
    perSecondCredits: number;
    baseUsd: number;
    perSecondUsd: number;
    secondSecondCredits?: number;
    secondSecondUsd?: number;
}

export interface ViduModelConfig {
    id: string;
    label: string;
    description: string;
    capability: ViduCapability | 'HYBRID';
    durations: readonly number[];
    defaultDuration: number;
    resolutions: readonly ResolutionOption[];
    defaultResolution: ResolutionOption;
    maxReferenceImages: number;
    pricing: Partial<Record<ViduCapability, Record<ResolutionOption, ResolutionPricingDefinition>>>;
}

export const CAPABILITY_LABELS: Record<ViduCapability, string> = {
    IMAGE_TO_VIDEO: 'Image-to-Video & Start-End',
    TEXT_TO_VIDEO: 'Text-to-Video',
    REFERENCE_TO_VIDEO: 'Reference-to-Video'
};

export const COMMON_DURATIONS = [...VIDEO_GENERATION.DURATIONS] as const;
export const COMMON_RESOLUTIONS = VIDEO_GENERATION.RESOLUTIONS;

export const isResolutionOption = (value: string): value is ResolutionOption =>
    (COMMON_RESOLUTIONS as readonly string[]).includes(value);

export const VIDU_Q2_MODEL_CONFIG: Record<string, ViduModelConfig> = {
    'vidu-q2-turbo': {
        id: 'vidu-q2-turbo',
        label: 'Vidu Q2 Turbo',
        description: 'Fastest Q2 image-to-video (best for storyboard start/end workflows).',
        capability: 'IMAGE_TO_VIDEO',
        durations: COMMON_DURATIONS,
        defaultDuration: 4,
        resolutions: COMMON_RESOLUTIONS,
        defaultResolution: '720p',
        maxReferenceImages: 7,
        pricing: {
            IMAGE_TO_VIDEO: {
                '540p': {
                    baseCredits: 6,
                    perSecondCredits: 2,
                    baseUsd: 0.03,
                    perSecondUsd: 0.01
                },
                '720p': {
                    baseCredits: 8,
                    secondSecondCredits: 10,
                    perSecondCredits: 10,
                    baseUsd: 0.04,
                    secondSecondUsd: 0.01,
                    perSecondUsd: 0.05
                },
                '1080p': {
                    baseCredits: 35,
                    perSecondCredits: 10,
                    baseUsd: 0.175,
                    perSecondUsd: 0.05
                }
            }
        }
    },
    'vidu-q2-pro': {
        id: 'vidu-q2-pro',
        label: 'Vidu Q2 Pro',
        description: 'Premium Q2 image-to-video output with more headroom for upscale.',
        capability: 'IMAGE_TO_VIDEO',
        durations: COMMON_DURATIONS,
        defaultDuration: 4,
        resolutions: COMMON_RESOLUTIONS,
        defaultResolution: '720p',
        maxReferenceImages: 7,
        pricing: {
            IMAGE_TO_VIDEO: {
                '540p': {
                    baseCredits: 8,
                    secondSecondCredits: 10,
                    perSecondCredits: 5,
                    baseUsd: 0.04,
                    secondSecondUsd: 0.01,
                    perSecondUsd: 0.025
                },
                '720p': {
                    baseCredits: 15,
                    perSecondCredits: 10,
                    baseUsd: 0.075,
                    perSecondUsd: 0.05
                },
                '1080p': {
                    baseCredits: 55,
                    perSecondCredits: 15,
                    baseUsd: 0.275,
                    perSecondUsd: 0.075
                }
            }
        }
    },
    'vidu-q2': {
        id: 'vidu-q2',
        label: 'Vidu Q2',
        description: 'Core Q2 model for pure text prompts or reference-to-video runs.',
        capability: 'HYBRID',
        durations: COMMON_DURATIONS,
        defaultDuration: 4,
        resolutions: COMMON_RESOLUTIONS,
        defaultResolution: '540p',
        maxReferenceImages: 7,
        pricing: {
            TEXT_TO_VIDEO: {
                '540p': {
                    baseCredits: 10,
                    perSecondCredits: 2,
                    baseUsd: 0.05,
                    perSecondUsd: 0.01
                },
                '720p': {
                    baseCredits: 15,
                    perSecondCredits: 5,
                    baseUsd: 0.075,
                    perSecondUsd: 0.025
                },
                '1080p': {
                    baseCredits: 20,
                    perSecondCredits: 10,
                    baseUsd: 0.1,
                    perSecondUsd: 0.05
                }
            },
            REFERENCE_TO_VIDEO: {
                '540p': {
                    baseCredits: 15,
                    perSecondCredits: 5,
                    baseUsd: 0.075,
                    perSecondUsd: 0.025
                },
                '720p': {
                    baseCredits: 25,
                    perSecondCredits: 5,
                    baseUsd: 0.125,
                    perSecondUsd: 0.025
                },
                '1080p': {
                    baseCredits: 75,
                    perSecondCredits: 10,
                    baseUsd: 0.375,
                    perSecondUsd: 0.05
                }
            }
        }
    }
};

export const determineCapability = (config: ViduModelConfig, hasReferenceImages: boolean): ViduCapability => {
    if (config.capability === 'HYBRID') {
        return hasReferenceImages ? 'REFERENCE_TO_VIDEO' : 'TEXT_TO_VIDEO';
    }
    return config.capability;
};

export const getPricingDefinition = (
    config: ViduModelConfig,
    requestedCapability: ViduCapability,
    resolution: ResolutionOption
): ResolutionPricingDefinition | undefined => {
    const mapping = config.pricing[requestedCapability];
    if (!mapping) {
        return undefined;
    }
    return mapping[resolution];
};

const accumulateTotals = (duration: number, definition: ResolutionPricingDefinition, valueKey: 'credit' | 'usd'): number => {
    const base = valueKey === 'credit' ? definition.baseCredits : definition.baseUsd;
    const perSecond = valueKey === 'credit' ? definition.perSecondCredits : definition.perSecondUsd;
    const secondSecond = valueKey === 'credit' ? definition.secondSecondCredits : definition.secondSecondUsd;

    if (duration <= 1) {
        return base;
    }

    let total = base;
    if (secondSecond !== undefined) {
        total += secondSecond;
        if (duration > 2) {
            total += perSecond * (duration - 2);
        }
    } else {
        total += perSecond * (duration - 1);
    }
    return total;
};

export const calculatePricing = (duration: number, definition: ResolutionPricingDefinition) => {
    const totalCredits = accumulateTotals(duration, definition, 'credit');
    const totalUsd = accumulateTotals(duration, definition, 'usd');
    const standardCredits = Math.ceil(totalCredits);
    const standardUsd = Number(totalUsd.toFixed(2));
    const offPeakCredits = Math.ceil(totalCredits / 2);
    const offPeakUsd = Number((totalUsd / 2).toFixed(2));

    return {
        standardCredits,
        standardUsd,
        offPeakCredits,
        offPeakUsd
    };
};

export const formatUsd = (value: number) => `$${value.toFixed(2)}`;
