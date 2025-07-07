// src/hooks/core/useContractErrors.ts - Enhanced error parsing for upgraded contracts
import { useCallback } from 'react';

export interface ErrorContext {
  operation?: string;
  contract?: string;
  amount?: string;
  tokenId?: string;
  userAddress?: string;
  methodName?: string;
  chainId?: number;
}

export interface ParsedError {
  message: string;
  type: 'user_rejection' | 'insufficient_funds' | 'contract_error' | 'network_error' | 'validation_error' | 'unknown';
  isRetryable: boolean;
  suggestions: string[];
  originalError?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Enhanced contract-specific error parsing utilities
 * Provides user-friendly error messages and actionable suggestions for upgraded contracts
 */
export function useContractErrors() {

  /**
   * Parse any error into a user-friendly message with enhanced context
   */
  const parseError = useCallback((error: any, context?: ErrorContext): ParsedError => {
    const message = error?.message || error?.toString() || 'Unknown error occurred';
    const lowerMessage = message.toLowerCase();
    
    // Enhanced logging for development
    if (process.env.NODE_ENV === 'development') {
      console.group('🔍 Enhanced Error Analysis');
      console.log('Original error:', error);
      console.log('Context:', context);
      console.log('Message:', message);
      console.groupEnd();
    }

    // User rejection errors (highest priority)
    if (lowerMessage.includes('user rejected') || 
        lowerMessage.includes('user denied') || 
        lowerMessage.includes('user cancelled') ||
        lowerMessage.includes('rejected by user')) {
      return {
        message: "Transaction was cancelled by user",
        type: 'user_rejection',
        isRetryable: true,
        suggestions: ["Try the transaction again when ready"],
        severity: 'low'
      };
    }

    // Network and connection errors
    if (lowerMessage.includes('network') || 
        lowerMessage.includes('rpc') || 
        lowerMessage.includes('connection') ||
        lowerMessage.includes('timeout')) {
      return {
        message: "Network connection error - please try again",
        type: 'network_error',
        isRetryable: true,
        suggestions: [
          "Check your internet connection",
          "Try again in a few moments",
          "Switch to a different network if available"
        ],
        severity: 'medium'
      };
    }

    // Insufficient funds errors
    if (lowerMessage.includes('insufficient funds') || 
        lowerMessage.includes('insufficient balance') ||
        lowerMessage.includes('insufficient ether') ||
        lowerMessage.includes('insufficient gas')) {
      const baseMessage = context?.amount 
        ? `Insufficient funds for ${context.amount} transaction`
        : "Insufficient funds for this transaction";
      
      return {
        message: baseMessage,
        type: 'insufficient_funds',
        isRetryable: true,
        suggestions: [
          "Check your wallet balance",
          "Ensure you have enough ETH for gas fees",
          context?.amount ? "Try a smaller amount" : "Add funds to your wallet"
        ].filter(Boolean),
        severity: 'high'
      };
    }

    // Enhanced ERC20 Token Errors
    if (lowerMessage.includes('erc20insufficientbalance')) {
      const tokenName = getTokenName(context?.contract);
      return {
        message: `Insufficient ${tokenName} balance`,
        type: 'contract_error',
        isRetryable: true,
        suggestions: [
          `Check your ${tokenName} balance`,
          "Try a smaller amount",
          tokenName === 'EMARK' ? "You may need to acquire more EMARK tokens" : "Ensure you have enough tokens"
        ].filter(Boolean),
        severity: 'high'
      };
    }

    if (lowerMessage.includes('erc20insufficientallowance')) {
      const tokenName = getTokenName(context?.contract);
      return {
        message: `Please approve more ${tokenName} for this contract`,
        type: 'contract_error',
        isRetryable: true,
        suggestions: [
          "Increase the token approval amount",
          "Try approving the maximum amount for future transactions"
        ],
        severity: 'medium'
      };
    }

    // Enhanced ERC721 NFT Errors
    if (lowerMessage.includes('erc721nonexistenttoken')) {
      return {
        message: context?.tokenId 
          ? `Evermark #${context.tokenId} does not exist`
          : "This NFT does not exist",
        type: 'contract_error',
        isRetryable: false,
        suggestions: ["Check the token ID and try again"],
        severity: 'high'
      };
    }

    if (lowerMessage.includes('erc721incorrectowner') || lowerMessage.includes('not the owner')) {
      return {
        message: context?.tokenId 
          ? `You don't own Evermark #${context.tokenId}`
          : "You don't own this NFT",
        type: 'contract_error',
        isRetryable: false,
        suggestions: ["Make sure you're using the correct wallet"],
        severity: 'high'
      };
    }

    // Enhanced Voting-specific errors
    if (lowerMessage.includes('insufficient voting power')) {
      return {
        message: "Insufficient voting power for this delegation",
        type: 'contract_error',
        isRetryable: true,
        suggestions: [
          "Check your available voting power",
          "Try delegating a smaller amount",
          "Ensure you have staked wEMARK tokens"
        ],
        severity: 'medium'
      };
    }

    if (lowerMessage.includes('cannot vote on own evermark') || 
        lowerMessage.includes('self delegation not allowed')) {
      return {
        message: "You cannot vote on your own Evermark",
        type: 'contract_error',
        isRetryable: false,
        suggestions: ["Try voting on a different Evermark"],
        severity: 'medium'
      };
    }

    if (lowerMessage.includes('voting cycle') && lowerMessage.includes('ended')) {
      return {
        message: "Voting cycle has ended",
        type: 'contract_error',
        isRetryable: false,
        suggestions: ["Wait for the next voting cycle to begin"],
        severity: 'medium'
      };
    }

    // Enhanced Staking/Wrapping errors (CardCatalog v2)
    if (lowerMessage.includes('unbonding period') && lowerMessage.includes('not complete')) {
      return {
        message: "Unbonding period is not complete yet",
        type: 'contract_error',
        isRetryable: true,
        suggestions: [
          "Wait for the unbonding period to finish",
          "Check the remaining time in your staking dashboard"
        ],
        severity: 'medium'
      };
    }

    if (lowerMessage.includes('nothing to unwrap') || lowerMessage.includes('no unbonding')) {
      return {
        message: "No tokens available to unwrap",
        type: 'contract_error',
        isRetryable: false,
        suggestions: [
          "Stake tokens first to be able to unwrap them",
          "Check your staked balance"
        ],
        severity: 'low'
      };
    }

    // Enhanced Gas and execution errors
    if (lowerMessage.includes('gas') && (lowerMessage.includes('estimation failed') || lowerMessage.includes('out of gas'))) {
      return {
        message: "Transaction would fail due to insufficient gas",
        type: 'network_error',
        isRetryable: true,
        suggestions: [
          "Check your transaction parameters",
          "Try increasing the gas limit",
          "Wait for network congestion to decrease"
        ],
        severity: 'medium'
      };
    }

    // Contract paused errors
    if (lowerMessage.includes('paused') || lowerMessage.includes('emergency')) {
      return {
        message: "Contract is currently paused for maintenance",
        type: 'contract_error',
        isRetryable: true,
        suggestions: [
          "Try again later when maintenance is complete",
          "Check official announcements for updates"
        ],
        severity: 'high'
      };
    }

    // Enhanced Rewards-specific errors
    if (lowerMessage.includes('no rewards') || lowerMessage.includes('nothing to claim')) {
      return {
        message: "No rewards available to claim",
        type: 'contract_error',
        isRetryable: false,
        suggestions: [
          "Stake tokens to start earning rewards",
          "Wait for the next reward distribution"
        ],
        severity: 'low'
      };
    }

    // Enhanced Leaderboard errors
    if (lowerMessage.includes('leaderboard') && lowerMessage.includes('not found')) {
      return {
        message: "Leaderboard data not available for this cycle",
        type: 'contract_error',
        isRetryable: true,
        suggestions: [
          "Wait for the cycle to complete",
          "Try a different cycle number"
        ],
        severity: 'medium'
      };
    }

    // Fee Collector errors
    if (lowerMessage.includes('fee destination') || lowerMessage.includes('invalid split')) {
      return {
        message: "Fee collection configuration error",
        type: 'contract_error',
        isRetryable: false,
        suggestions: [
          "Contact support for fee configuration issues",
          "Verify the fee collection setup"
        ],
        severity: 'high'
      };
    }

    // Execution reverted with specific reason
    if (lowerMessage.includes('execution reverted')) {
      const revertMatch = message.match(/execution reverted:?\s*(.+)/i);
      const revertReason = revertMatch ? revertMatch[1].trim() : null;
      
      if (revertReason) {
        return parseRevertReason(revertReason, context);
      }
      
      return {
        message: "Transaction was reverted by the contract",
        type: 'contract_error',
        isRetryable: true,
        suggestions: [
          "Check your transaction parameters",
          "Ensure all requirements are met",
          "Try with different values"
        ],
        severity: 'medium'
      };
    }

    // Access Control errors (for admin functions)
    if (lowerMessage.includes('accesscontrol') || lowerMessage.includes('unauthorized')) {
      return {
        message: "You don't have permission to perform this action",
        type: 'validation_error',
        isRetryable: false,
        suggestions: [
          "Ensure you're using the correct wallet",
          "Contact an administrator if you should have access"
        ],
        severity: 'high'
      };
    }

    // Unknown errors with enhanced context
    const contextInfo = context ? ` (${context.operation || context.methodName || 'unknown operation'})` : '';
    return {
      message: `Transaction failed${contextInfo}: ${message}`,
      type: 'unknown',
      isRetryable: true,
      suggestions: [
        "Try the transaction again",
        "Check your wallet connection",
        "Contact support if the problem persists"
      ],
      originalError: message,
      severity: 'medium'
    };
  }, []);

  /**
   * Enhanced revert reason parsing
   */
  const parseRevertReason = useCallback((reason: string, context?: ErrorContext): ParsedError => {
    const lowerReason = reason.toLowerCase();

    // Enhanced revert reason mappings
    const revertMappings: Record<string, {
      message: string;
      suggestions: string[];
      severity: ParsedError['severity'];
    }> = {
      'insufficient balance': {
        message: "Insufficient balance for this transaction",
        suggestions: ["Check your balance and try a smaller amount"],
        severity: 'high'
      },
      'transfer amount exceeds allowance': {
        message: "Token allowance exceeded",
        suggestions: ["Approve more tokens for this contract"],
        severity: 'medium'
      },
      'transfer amount exceeds balance': {
        message: "Transfer amount exceeds your balance",
        suggestions: ["Try transferring a smaller amount"],
        severity: 'high'
      },
      'already claimed': {
        message: "Rewards have already been claimed",
        suggestions: ["Wait for the next reward period"],
        severity: 'low'
      },
      'not owner': {
        message: "You don't have permission for this action",
        suggestions: ["Ensure you're using the correct wallet"],
        severity: 'high'
      },
      'invalid amount': {
        message: "Invalid amount specified",
        suggestions: ["Check the amount and try again"],
        severity: 'medium'
      },
      'cycle not ended': {
        message: "Voting cycle has not ended yet",
        suggestions: ["Wait for the current cycle to complete"],
        severity: 'medium'
      },
      'already voted': {
        message: "You have already voted in this cycle",
        suggestions: ["Wait for the next voting cycle"],
        severity: 'low'
      }
    };

    for (const [key, value] of Object.entries(revertMappings)) {
      if (lowerReason.includes(key)) {
        return {
          message: value.message,
          type: 'contract_error',
          isRetryable: value.severity !== 'high',
          suggestions: value.suggestions,
          severity: value.severity
        };
      }
    }

    // Fallback for unknown revert reasons
    return {
      message: `Contract error: ${reason}`,
      type: 'contract_error',
      isRetryable: true,
      suggestions: ["Check the transaction parameters and try again"],
      originalError: reason,
      severity: 'medium'
    };
  }, []);

  /**
   * Enhanced error type checks
   */
  const isUserRejection = useCallback((error: any): boolean => {
    const message = error?.message || error?.toString() || '';
    return /user\s+(rejected|denied|cancelled)/i.test(message);
  }, []);

  const isInsufficientFunds = useCallback((error: any): boolean => {
    const message = error?.message || error?.toString() || '';
    return /insufficient\s+(funds|balance|ether|gas)/i.test(message);
  }, []);

  const isNetworkError = useCallback((error: any): boolean => {
    const message = error?.message || error?.toString() || '';
    return /network|rpc|connection|timeout/i.test(message);
  }, []);

  const isContractError = useCallback((error: any): boolean => {
    const message = error?.message || error?.toString() || '';
    return /execution reverted|contract|revert/i.test(message);
  }, []);

  /**
   * Check if error is retryable
   */
  const isRetryable = useCallback((error: any): boolean => {
    const parsedError = parseError(error);
    return parsedError.isRetryable;
  }, [parseError]);

  /**
   * Get user-friendly error message with suggestions
   */
  const getErrorMessage = useCallback((error: any, context?: ErrorContext): string => {
    const parsedError = parseError(error, context);
    return parsedError.message;
  }, [parseError]);

  /**
   * Get error suggestions for user action
   */
  const getErrorSuggestions = useCallback((error: any, context?: ErrorContext): string[] => {
    const parsedError = parseError(error, context);
    return parsedError.suggestions || [];
  }, [parseError]);

  /**
   * Get error severity level
   */
  const getErrorSeverity = useCallback((error: any, context?: ErrorContext): ParsedError['severity'] => {
    const parsedError = parseError(error, context);
    return parsedError.severity;
  }, [parseError]);

  return {
    // Main parsing function
    parseError,
    
    // Specific error type checks
    isUserRejection,
    isInsufficientFunds,
    isNetworkError,
    isContractError,
    isRetryable,
    
    // Convenience functions
    getErrorMessage,
    getErrorSuggestions,
    getErrorSeverity,
    
    // For backward compatibility
    parseContractError: parseError,
  };
}

/**
 * Helper function to get user-friendly token name
 */
function getTokenName(contract?: string): string {
  switch (contract?.toUpperCase()) {
    case 'EMARK_TOKEN':
    case 'EMARK':
      return 'EMARK';
    case 'CARD_CATALOG':
    case 'WEMARK':
      return 'wEMARK';
    default:
      return 'tokens';
  }
}

/**
 * Enhanced error context builder
 */
export function createErrorContext(
  operation: string,
  contract: string,
  additionalContext?: Partial<ErrorContext>
): ErrorContext {
  return {
    operation,
    contract,
    ...additionalContext,
    timestamp: Date.now()
  };
}