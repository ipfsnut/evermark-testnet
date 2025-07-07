// src/hooks/core/useContractErrors.ts - Contract-specific error parsing
import { useCallback } from 'react';

export interface ErrorContext {
  operation?: string;
  contract?: string;
  amount?: string;
  tokenId?: string;
}

export interface ParsedError {
  message: string;
  type: 'user_rejection' | 'insufficient_funds' | 'contract_error' | 'network_error' | 'unknown';
  isRetryable: boolean;
  suggestions?: string[];
}

/**
 * Contract-specific error parsing utilities
 * Provides user-friendly error messages and actionable suggestions
 */
export function useContractErrors() {

  /**
   * Parse any error into a user-friendly message with context
   */
  const parseError = useCallback((error: any, context?: ErrorContext): ParsedError => {
    const message = error.message || error.toString() || 'Unknown error occurred';
    const lowerMessage = message.toLowerCase();
    
    console.log('🔍 Parsing error:', { message, context });

    // User rejection errors
    if (lowerMessage.includes('user rejected') || lowerMessage.includes('user denied')) {
      return {
        message: "Transaction was cancelled by user",
        type: 'user_rejection',
        isRetryable: true,
        suggestions: ["Try the transaction again when ready"]
      };
    }

    // Insufficient funds errors
    if (lowerMessage.includes('insufficient funds') || lowerMessage.includes('insufficient balance')) {
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
          "Try a smaller amount"
        ]
      };
    }

    // ERC20 Token Errors
    if (lowerMessage.includes('erc20insufficientbalance')) {
      const tokenName = context?.contract === 'EMARK_TOKEN' ? 'EMARK' : 'tokens';
      return {
        message: `Insufficient ${tokenName} balance`,
        type: 'contract_error',
        isRetryable: true,
        suggestions: [
          `Check your ${tokenName} balance`,
          "Try a smaller amount",
          context?.contract === 'EMARK_TOKEN' ? "You may need to acquire more EMARK tokens" : undefined
        ].filter(Boolean) as string[]
      };
    }

    if (lowerMessage.includes('erc20insufficientallowance')) {
      const tokenName = context?.contract === 'EMARK_TOKEN' ? 'EMARK' : 'tokens';
      return {
        message: `Please approve more ${tokenName} for this contract`,
        type: 'contract_error',
        isRetryable: true,
        suggestions: [
          "Increase the token approval amount",
          "Try approving the maximum amount for future transactions"
        ]
      };
    }

    // ERC721 NFT Errors
    if (lowerMessage.includes('erc721nonexistenttoken')) {
      return {
        message: context?.tokenId 
          ? `Evermark #${context.tokenId} does not exist`
          : "This NFT does not exist",
        type: 'contract_error',
        isRetryable: false,
        suggestions: ["Check the token ID and try again"]
      };
    }

    if (lowerMessage.includes('erc721incorrectowner')) {
      return {
        message: context?.tokenId 
          ? `You don't own Evermark #${context.tokenId}`
          : "You don't own this NFT",
        type: 'contract_error',
        isRetryable: false,
        suggestions: ["Make sure you're using the correct wallet"]
      };
    }

    // Voting-specific errors
    if (lowerMessage.includes('insufficient voting power')) {
      return {
        message: "Insufficient voting power for this delegation",
        type: 'contract_error',
        isRetryable: true,
        suggestions: [
          "Check your available voting power",
          "Try delegating a smaller amount",
          "Ensure you have staked wEMARK tokens"
        ]
      };
    }

    if (lowerMessage.includes('cannot vote on own evermark')) {
      return {
        message: "You cannot vote on your own Evermark",
        type: 'contract_error',
        isRetryable: false,
        suggestions: ["Try voting on a different Evermark"]
      };
    }

    if (lowerMessage.includes('voting cycle') && lowerMessage.includes('ended')) {
      return {
        message: "Voting cycle has ended",
        type: 'contract_error',
        isRetryable: false,
        suggestions: ["Wait for the next voting cycle to begin"]
      };
    }

    // Staking/Wrapping errors
    if (lowerMessage.includes('unbonding period') && lowerMessage.includes('not complete')) {
      return {
        message: "Unbonding period is not complete yet",
        type: 'contract_error',
        isRetryable: true,
        suggestions: [
          "Wait for the unbonding period to finish",
          "Check the remaining time in your staking dashboard"
        ]
      };
    }

    // Gas and network errors
    if (lowerMessage.includes('gas') && (lowerMessage.includes('estimation failed') || lowerMessage.includes('out of gas'))) {
      return {
        message: "Transaction would fail due to insufficient gas",
        type: 'network_error',
        isRetryable: true,
        suggestions: [
          "Check your transaction parameters",
          "Try increasing the gas limit",
          "Wait for network congestion to decrease"
        ]
      };
    }

    if (lowerMessage.includes('network') || lowerMessage.includes('rpc')) {
      return {
        message: "Network connection error",
        type: 'network_error',
        isRetryable: true,
        suggestions: [
          "Check your internet connection",
          "Try again in a few moments",
          "Switch to a different RPC endpoint if available"
        ]
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
        ]
      };
    }

    // Rewards-specific errors
    if (lowerMessage.includes('no rewards') || lowerMessage.includes('nothing to claim')) {
      return {
        message: "No rewards available to claim",
        type: 'contract_error',
        isRetryable: false,
        suggestions: [
          "Stake tokens to start earning rewards",
          "Wait for the next reward distribution"
        ]
      };
    }

    // Execution reverted with specific reason
    if (lowerMessage.includes('execution reverted')) {
      const revertMatch = message.match(/execution reverted: (.+)/i);
      const revertReason = revertMatch ? revertMatch[1] : null;
      
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
        ]
      };
    }

    // Unknown errors
    return {
      message: context?.operation 
        ? `Failed to ${context.operation}: ${message}`
        : `Transaction failed: ${message}`,
      type: 'unknown',
      isRetryable: true,
      suggestions: [
        "Try the transaction again",
        "Check your wallet connection",
        "Contact support if the problem persists"
      ]
    };
  }, []);

  /**
   * Parse specific revert reasons into user-friendly messages
   */
  const parseRevertReason = useCallback((reason: string, context?: ErrorContext): ParsedError => {
    const lowerReason = reason.toLowerCase();

    // Common revert reasons
    const revertMappings = {
      'insufficient balance': {
        message: "Insufficient balance for this transaction",
        suggestions: ["Check your balance and try a smaller amount"]
      },
      'transfer amount exceeds allowance': {
        message: "Token allowance exceeded",
        suggestions: ["Approve more tokens for this contract"]
      },
      'transfer amount exceeds balance': {
        message: "Transfer amount exceeds your balance",
        suggestions: ["Try transferring a smaller amount"]
      },
      'already claimed': {
        message: "Rewards have already been claimed",
        suggestions: ["Wait for the next reward period"]
      },
      'not owner': {
        message: "You don't have permission for this action",
        suggestions: ["Ensure you're using the correct wallet"]
      },
      'invalid amount': {
        message: "Invalid amount specified",
        suggestions: ["Check the amount and try again"]
      }
    };

    for (const [key, value] of Object.entries(revertMappings)) {
      if (lowerReason.includes(key)) {
        return {
          message: value.message,
          type: 'contract_error',
          isRetryable: true,
          suggestions: value.suggestions
        };
      }
    }

    // Fallback for unknown revert reasons
    return {
      message: `Contract error: ${reason}`,
      type: 'contract_error',
      isRetryable: true,
      suggestions: ["Check the transaction parameters and try again"]
    };
  }, []);

  /**
   * Check if error is a user rejection
   */
  const isUserRejection = useCallback((error: any): boolean => {
    const message = error.message || error.toString();
    return message.toLowerCase().includes('user rejected') || 
           message.toLowerCase().includes('user denied');
  }, []);

  /**
   * Check if error is due to insufficient funds
   */
  const isInsufficientFunds = useCallback((error: any): boolean => {
    const message = error.message || error.toString();
    return message.toLowerCase().includes('insufficient funds') ||
           message.toLowerCase().includes('insufficient balance');
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

  return {
    // Main parsing function
    parseError,
    
    // Specific error type checks
    isUserRejection,
    isInsufficientFunds,
    isRetryable,
    
    // Convenience functions
    getErrorMessage,
    getErrorSuggestions,
    
    // For backward compatibility
    parseContractError: parseError,
  };
}