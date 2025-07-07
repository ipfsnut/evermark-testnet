// src/hooks/core/useContractErrors.ts - Enhanced error parsing for ThirdWeb v5 with upgraded contracts
import { useCallback } from 'react';

export interface ErrorContext {
  operation?: string;
  contract?: string;
  amount?: string;
  tokenId?: string;
  userAddress?: string;
  methodName?: string;
  chainId?: number;
  blockNumber?: number;
  gasUsed?: bigint;
  transactionHash?: string;
}

export interface ParsedError {
  message: string;
  type: 'user_rejection' | 'insufficient_funds' | 'contract_error' | 'network_error' | 'validation_error' | 'unknown';
  isRetryable: boolean;
  suggestions: string[];
  originalError?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  code?: string | number;
  details?: Record<string, any>;
}

/**
 * Enhanced contract-specific error parsing utilities for ThirdWeb v5
 * Provides user-friendly error messages and actionable suggestions for upgraded contracts
 */
export function useContractErrors() {

  /**
   * Enhanced error parsing with support for ThirdWeb v5 error formats
   */
  const parseError = useCallback((error: any, context?: ErrorContext): ParsedError => {
    const message = error?.message || error?.reason || error?.toString() || 'Unknown error occurred';
    const lowerMessage = message.toLowerCase();
    
    // Enhanced logging for development
    if (process.env.NODE_ENV === 'development') {
      console.group('🔍 Enhanced Error Analysis (ThirdWeb v5)');
      console.log('Original error:', error);
      console.log('Error name:', error?.name);
      console.log('Error code:', error?.code);
      console.log('Error data:', error?.data);
      console.log('Context:', context);
      console.log('Message:', message);
      console.groupEnd();
    }

    // ThirdWeb v5 specific error handling
    if (error?.code === 'ACTION_REJECTED' || error?.code === 4001) {
      return {
        message: "Transaction was cancelled by user",
        type: 'user_rejection',
        isRetryable: true,
        suggestions: ["Try the transaction again when ready"],
        severity: 'low',
        code: error.code
      };
    }

    // User rejection errors (highest priority)
    if (lowerMessage.includes('user rejected') || 
        lowerMessage.includes('user denied') || 
        lowerMessage.includes('user cancelled') ||
        lowerMessage.includes('rejected by user') ||
        lowerMessage.includes('user rejected the request')) {
      return {
        message: "Transaction was cancelled by user",
        type: 'user_rejection',
        isRetryable: true,
        suggestions: ["Try the transaction again when ready"],
        severity: 'low'
      };
    }

    // Enhanced network and connection errors
    if (lowerMessage.includes('network') || 
        lowerMessage.includes('rpc') || 
        lowerMessage.includes('connection') ||
        lowerMessage.includes('timeout') ||
        lowerMessage.includes('fetch') ||
        error?.code === 'NETWORK_ERROR') {
      return {
        message: "Network connection error - please try again",
        type: 'network_error',
        isRetryable: true,
        suggestions: [
          "Check your internet connection",
          "Try again in a few moments",
          "Switch to a different RPC endpoint if available",
          "Refresh the page and try again"
        ],
        severity: 'medium',
        code: error?.code
      };
    }

    // Enhanced insufficient funds errors
    if (lowerMessage.includes('insufficient funds') || 
        lowerMessage.includes('insufficient balance') ||
        lowerMessage.includes('insufficient ether') ||
        lowerMessage.includes('insufficient gas') ||
        lowerMessage.includes('exceeds balance') ||
        error?.code === 'INSUFFICIENT_FUNDS') {
      
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
          context?.amount ? "Try a smaller amount" : "Add funds to your wallet",
          "Consider using a different payment method"
        ].filter(Boolean),
        severity: 'high',
        code: error?.code
      };
    }

    // Enhanced ERC20 Token Errors with better specificity
    if (lowerMessage.includes('erc20insufficientbalance') || 
        lowerMessage.includes('transfer amount exceeds balance')) {
      const tokenName = getTokenName(context?.contract);
      return {
        message: `Insufficient ${tokenName} balance`,
        type: 'contract_error',
        isRetryable: true,
        suggestions: [
          `Check your ${tokenName} balance`,
          "Try a smaller amount",
          tokenName === 'EMARK' ? "You may need to acquire more EMARK tokens" : "Ensure you have enough tokens",
          "Refresh your balance and try again"
        ].filter(Boolean),
        severity: 'high',
        details: { tokenName, balance: 'insufficient' }
      };
    }

    if (lowerMessage.includes('erc20insufficientallowance') ||
        lowerMessage.includes('transfer amount exceeds allowance')) {
      const tokenName = getTokenName(context?.contract);
      return {
        message: `Please approve more ${tokenName} for this contract`,
        type: 'contract_error',
        isRetryable: true,
        suggestions: [
          "Increase the token approval amount",
          "Try approving the maximum amount for future transactions",
          "Complete the approval transaction first, then retry"
        ],
        severity: 'medium',
        details: { tokenName, action: 'approval_required' }
      };
    }

    // Enhanced ERC721 NFT Errors
    if (lowerMessage.includes('erc721nonexistenttoken') ||
        lowerMessage.includes('nonexistent token')) {
      return {
        message: context?.tokenId 
          ? `Evermark #${context.tokenId} does not exist`
          : "This NFT does not exist",
        type: 'contract_error',
        isRetryable: false,
        suggestions: [
          "Check the token ID and try again",
          "Verify the NFT hasn't been burned",
          "Ensure you're on the correct network"
        ],
        severity: 'high',
        details: { tokenId: context?.tokenId }
      };
    }

    if (lowerMessage.includes('erc721incorrectowner') || 
        lowerMessage.includes('not the owner') ||
        lowerMessage.includes('caller is not owner')) {
      return {
        message: context?.tokenId 
          ? `You don't own Evermark #${context.tokenId}`
          : "You don't own this NFT",
        type: 'contract_error',
        isRetryable: false,
        suggestions: [
          "Make sure you're using the correct wallet",
          "Verify the NFT ownership",
          "Check if the NFT was recently transferred"
        ],
        severity: 'high',
        details: { tokenId: context?.tokenId, owner: 'incorrect' }
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
          "Ensure you have staked wEMARK tokens",
          "Wait for any pending transactions to complete"
        ],
        severity: 'medium',
        details: { votingPower: 'insufficient' }
      };
    }

    if (lowerMessage.includes('cannot vote on own evermark') || 
        lowerMessage.includes('self delegation not allowed') ||
        lowerMessage.includes('self voting prohibited')) {
      return {
        message: "You cannot vote on your own Evermark",
        type: 'contract_error',
        isRetryable: false,
        suggestions: [
          "Try voting on a different Evermark",
          "Consider delegating to other community members"
        ],
        severity: 'medium',
        details: { action: 'self_vote_prohibited' }
      };
    }

    if (lowerMessage.includes('voting cycle') && lowerMessage.includes('ended')) {
      return {
        message: "Voting cycle has ended",
        type: 'contract_error',
        isRetryable: false,
        suggestions: [
          "Wait for the next voting cycle to begin",
          "Check the cycle schedule for upcoming opportunities"
        ],
        severity: 'medium',
        details: { cycle: 'ended' }
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
          "Check the remaining time in your staking dashboard",
          "You can cancel unbonding if needed"
        ],
        severity: 'medium',
        details: { unbonding: 'in_progress' }
      };
    }

    if (lowerMessage.includes('nothing to unwrap') || 
        lowerMessage.includes('no unbonding') ||
        lowerMessage.includes('no tokens to claim')) {
      return {
        message: "No tokens available to unwrap",
        type: 'contract_error',
        isRetryable: false,
        suggestions: [
          "Stake tokens first to be able to unwrap them",
          "Check your staked balance",
          "Initiate unwrapping process if you have staked tokens"
        ],
        severity: 'low',
        details: { unwrap: 'nothing_available' }
      };
    }

    // Enhanced Gas and execution errors with better handling
    if (lowerMessage.includes('gas') && (lowerMessage.includes('estimation failed') || 
        lowerMessage.includes('out of gas') || lowerMessage.includes('gas required exceeds allowance'))) {
      return {
        message: "Transaction would fail due to gas issues",
        type: 'network_error',
        isRetryable: true,
        suggestions: [
          "Check your transaction parameters",
          "Try increasing the gas limit",
          "Wait for network congestion to decrease",
          "Ensure you have enough ETH for gas fees"
        ],
        severity: 'medium',
        details: { gas: 'insufficient_or_failed_estimation' }
      };
    }

    // Contract paused errors
    if (lowerMessage.includes('paused') || 
        lowerMessage.includes('emergency') ||
        lowerMessage.includes('contract is paused')) {
      return {
        message: "Contract is currently paused for maintenance",
        type: 'contract_error',
        isRetryable: true,
        suggestions: [
          "Try again later when maintenance is complete",
          "Check official announcements for updates",
          "Follow @evermark on social media for status updates"
        ],
        severity: 'high',
        details: { contract: 'paused' }
      };
    }

    // Enhanced Rewards-specific errors
    if (lowerMessage.includes('no rewards') || 
        lowerMessage.includes('nothing to claim') ||
        lowerMessage.includes('no claimable rewards')) {
      return {
        message: "No rewards available to claim",
        type: 'contract_error',
        isRetryable: false,
        suggestions: [
          "Stake tokens to start earning rewards",
          "Wait for the next reward distribution",
          "Check if rewards are still accumulating"
        ],
        severity: 'low',
        details: { rewards: 'none_available' }
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
          "Try a different cycle number",
          "Check if the cycle has been finalized"
        ],
        severity: 'medium',
        details: { leaderboard: 'not_found' }
      };
    }

    // Fee Collector errors
    if (lowerMessage.includes('fee destination') || 
        lowerMessage.includes('invalid split') ||
        lowerMessage.includes('fee collection failed')) {
      return {
        message: "Fee collection configuration error",
        type: 'contract_error',
        isRetryable: false,
        suggestions: [
          "Contact support for fee configuration issues",
          "Verify the fee collection setup",
          "Try again with different parameters"
        ],
        severity: 'high',
        details: { fee: 'configuration_error' }
      };
    }

    // Enhanced execution reverted handling
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
          "Try with different values",
          "Verify contract state hasn't changed"
        ],
        severity: 'medium',
        details: { execution: 'reverted' }
      };
    }

    // Enhanced Access Control errors
    if (lowerMessage.includes('accesscontrol') || 
        lowerMessage.includes('unauthorized') ||
        lowerMessage.includes('access denied') ||
        lowerMessage.includes('caller is not') ||
        error?.code === 'UNAUTHORIZED') {
      return {
        message: "You don't have permission to perform this action",
        type: 'validation_error',
        isRetryable: false,
        suggestions: [
          "Ensure you're using the correct wallet",
          "Contact an administrator if you should have access",
          "Verify your role or permissions",
          "Check if you need to stake tokens first"
        ],
        severity: 'high',
        code: error?.code,
        details: { access: 'denied' }
      };
    }

    // Slippage and DEX-related errors
    if (lowerMessage.includes('slippage') || 
        lowerMessage.includes('price impact') ||
        lowerMessage.includes('swap failed')) {
      return {
        message: "Transaction failed due to price changes",
        type: 'contract_error',
        isRetryable: true,
        suggestions: [
          "Try increasing slippage tolerance",
          "Wait for better market conditions",
          "Try a smaller amount",
          "Refresh the price and try again"
        ],
        severity: 'medium',
        details: { dex: 'slippage_or_price_impact' }
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
        "Verify your network connection",
        "Contact support if the problem persists"
      ],
      originalError: message,
      severity: 'medium',
      code: error?.code,
      details: context ? { context } : undefined
    };
  }, []);

  /**
   * Enhanced revert reason parsing with comprehensive mappings
   */
  const parseRevertReason = useCallback((reason: string, context?: ErrorContext): ParsedError => {
    const lowerReason = reason.toLowerCase();

    // Enhanced revert reason mappings with more specific cases
    const revertMappings: Record<string, {
      message: string;
      suggestions: string[];
      severity: ParsedError['severity'];
      details?: Record<string, any>;
    }> = {
      'insufficient balance': {
        message: "Insufficient balance for this transaction",
        suggestions: ["Check your balance and try a smaller amount"],
        severity: 'high',
        details: { balance: 'insufficient' }
      },
      'transfer amount exceeds allowance': {
        message: "Token allowance exceeded",
        suggestions: [
          "Approve more tokens for this contract",
          "Complete the approval transaction first"
        ],
        severity: 'medium',
        details: { allowance: 'exceeded' }
      },
      'transfer amount exceeds balance': {
        message: "Transfer amount exceeds your balance",
        suggestions: ["Try transferring a smaller amount"],
        severity: 'high',
        details: { transfer: 'exceeds_balance' }
      },
      'already claimed': {
        message: "Rewards have already been claimed",
        suggestions: ["Wait for the next reward period"],
        severity: 'low',
        details: { rewards: 'already_claimed' }
      },
      'not owner': {
        message: "You don't have permission for this action",
        suggestions: [
          "Ensure you're using the correct wallet",
          "Verify ownership of the required NFT or tokens"
        ],
        severity: 'high',
        details: { owner: 'incorrect' }
      },
      'invalid amount': {
        message: "Invalid amount specified",
        suggestions: [
          "Check the amount and try again",
          "Ensure the amount is greater than zero",
          "Try a different amount"
        ],
        severity: 'medium',
        details: { amount: 'invalid' }
      },
      'cycle not ended': {
        message: "Voting cycle has not ended yet",
        suggestions: ["Wait for the current cycle to complete"],
        severity: 'medium',
        details: { cycle: 'not_ended' }
      },
      'already voted': {
        message: "You have already voted in this cycle",
        suggestions: [
          "Wait for the next voting cycle",
          "You can modify your existing vote if allowed"
        ],
        severity: 'low',
        details: { vote: 'already_cast' }
      },
      'deadline passed': {
        message: "Transaction deadline has passed",
        suggestions: [
          "Try the transaction again with a new deadline",
          "Ensure your system clock is accurate"
        ],
        severity: 'medium',
        details: { deadline: 'passed' }
      }
    };

    for (const [key, value] of Object.entries(revertMappings)) {
      if (lowerReason.includes(key)) {
        return {
          message: value.message,
          type: 'contract_error',
          isRetryable: value.severity !== 'high',
          suggestions: value.suggestions,
          severity: value.severity,
          originalError: reason,
          details: value.details
        };
      }
    }

    // Fallback for unknown revert reasons
    return {
      message: `Contract error: ${reason}`,
      type: 'contract_error',
      isRetryable: true,
      suggestions: [
        "Check the transaction parameters and try again",
        "Verify contract state requirements",
        "Contact support if the error persists"
      ],
      originalError: reason,
      severity: 'medium',
      details: { revert: 'unknown_reason' }
    };
  }, []);

  /**
   * Enhanced error type checks with better accuracy
   */
  const isUserRejection = useCallback((error: any): boolean => {
    if (!error) return false;
    
    const message = error?.message || error?.toString() || '';
    const code = error?.code;
    
    return (
      code === 'ACTION_REJECTED' ||
      code === 4001 ||
      /user\s+(rejected|denied|cancelled)/i.test(message) ||
      message.includes('user rejected the request')
    );
  }, []);

  const isInsufficientFunds = useCallback((error: any): boolean => {
    if (!error) return false;
    
    const message = error?.message || error?.toString() || '';
    const code = error?.code;
    
    return (
      code === 'INSUFFICIENT_FUNDS' ||
      /insufficient\s+(funds|balance|ether|gas)/i.test(message) ||
      message.includes('exceeds balance')
    );
  }, []);

  const isNetworkError = useCallback((error: any): boolean => {
    if (!error) return false;
    
    const message = error?.message || error?.toString() || '';
    const code = error?.code;
    
    return (
      code === 'NETWORK_ERROR' ||
      /network|rpc|connection|timeout|fetch/i.test(message)
    );
  }, []);

  const isContractError = useCallback((error: any): boolean => {
    if (!error) return false;
    
    const message = error?.message || error?.toString() || '';
    return /execution reverted|contract|revert|require/i.test(message);
  }, []);

  /**
   * Enhanced retryability check with context awareness
   */
  const isRetryable = useCallback((error: any, context?: ErrorContext): boolean => {
    const parsedError = parseError(error, context);
    return parsedError.isRetryable;
  }, [parseError]);

  /**
   * Get user-friendly error message with enhanced formatting
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
   * Get error severity level with context
   */
  const getErrorSeverity = useCallback((error: any, context?: ErrorContext): ParsedError['severity'] => {
    const parsedError = parseError(error, context);
    return parsedError.severity;
  }, [parseError]);

  /**
   * Get error code if available
   */
  const getErrorCode = useCallback((error: any): string | number | undefined => {
    return error?.code;
  }, []);

  /**
   * Get error details for debugging
   */
  const getErrorDetails = useCallback((error: any, context?: ErrorContext): Record<string, any> | undefined => {
    const parsedError = parseError(error, context);
    return parsedError.details;
  }, [parseError]);

  /**
   * Check if error should trigger a wallet connection prompt
   */
  const shouldPromptWalletConnection = useCallback((error: any): boolean => {
    const message = error?.message || error?.toString() || '';
    return (
      message.includes('wallet not connected') ||
      message.includes('no wallet') ||
      message.includes('connect wallet') ||
      error?.code === 'NO_WALLET'
    );
  }, []);

  /**
   * Format error for user display with enhanced context
   */
  const formatErrorForDisplay = useCallback((error: any, context?: ErrorContext): {
    title: string;
    message: string;
    suggestions: string[];
    severity: ParsedError['severity'];
    canRetry: boolean;
  } => {
    const parsedError = parseError(error, context);
    
    // Create a user-friendly title based on error type
    const titleMap: Record<ParsedError['type'], string> = {
      'user_rejection': 'Transaction Cancelled',
      'insufficient_funds': 'Insufficient Funds',
      'contract_error': 'Contract Error',
      'network_error': 'Network Error',
      'validation_error': 'Invalid Input',
      'unknown': 'Transaction Failed'
    };
    
    return {
      title: titleMap[parsedError.type] || 'Error',
      message: parsedError.message,
      suggestions: parsedError.suggestions,
      severity: parsedError.severity,
      canRetry: parsedError.isRetryable
    };
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
    getErrorCode,
    getErrorDetails,
    shouldPromptWalletConnection,
    formatErrorForDisplay,
    
    // Enhanced capabilities
    parseRevertReason,
    
    // Legacy compatibility
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