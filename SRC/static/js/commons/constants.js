/**
 * Application Constants
 * Mirrors Python constants from app/utils/constants.py
 */

// Base Specification Constants
export const BaseSpecification = {
    REQUIREMENT: "requirement",
    SOURCE_CODE: "source_code",
    
    // All base specification values
    VALUES: ["requirement", "source_code"]
};

// Git Provider Constants
export const GitProvider = {
    GITHUB: "github",
    GITBUCKET: "gitbucket"
};

// Git Default Values
export const GitDefaults = {
    GITHUB_USER_NAME: "DocifyCode"
};

// Tab Names Constants
export const TabName = {
    REQUIREMENT: "requirement",
    BASIC_DESIGN: "basicDesign",
    DETAIL_DESIGN: "detailDesign",
    SOURCE_CODE: "sourceCode",
    UNIT_TEST_SPEC: "unitTestSpec",
    UNIT_TEST_CODE: "unitTestCode"
};

// Git Push Endpoint Path Mapping
export const GitPushEndpointPath = {
    REQUIREMENT: "requirement-documents",
    BASIC_DESIGN: "basic-design",
    DETAIL_DESIGN: "detail-design",
    SOURCE_CODE: "source",
    UNIT_TEST_SPEC: "utd",
    UNIT_TEST_CODE: "utc"
};

