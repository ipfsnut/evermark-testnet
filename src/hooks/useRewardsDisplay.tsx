import { useMemo } from 'react';
import { toEther } from "thirdweb/utils";
import { useRewards, useCurrentPeriodInfo } from './useRewards';

/**
 * 🔧 SHARED: Single source of truth for reward calculations and formatting
 * Both RewardsPanel and RewardsCalculator should use this hook
 */
export function useRewardsDisplay(userAddress?: string) {
  const rewardsData = useRewards(userAddress);
  const periodData = useCurrentPeriodInfo();

  // 🔧 CENTRALIZED: All reward calculations in one place
  const calculations = useMemo(() => {
    const {
      pendingEthRewards,
      pendingEmarkRewards,
      stakedAmount,
      periodEthRewards,
      periodEmarkRewards,
    } = rewardsData;

    // Convert all BigInt values to numbers using consistent method
    const ethRewards = pendingEthRewards ? parseFloat(toEther(pendingEthRewards)) : 0;
    const emarkRewards = pendingEmarkRewards ? parseFloat(toEther(pendingEmarkRewards)) : 0;
    const totalRewards = ethRewards + emarkRewards;
    const stakedAmountNum = stakedAmount ? parseFloat(toEther(stakedAmount)) : 0;
    const periodEthNum = periodEthRewards ? parseFloat(toEther(periodEthRewards)) : 0;
    const periodEmarkNum = periodEmarkRewards ? parseFloat(toEther(periodEmarkRewards)) : 0;

    // Calculate time-based projections
    const secondsInWeek = 7 * 24 * 60 * 60;
    const secondsInMonth = 30 * 24 * 60 * 60;
    const secondsInYear = 365 * 24 * 60 * 60;
    
    const periodDuration = periodData.periodEnd - periodData.periodStart;
    const weeklyMultiplier = periodDuration > 0 ? secondsInWeek / periodDuration : 0;
    const monthlyMultiplier = periodDuration > 0 ? secondsInMonth / periodDuration : 0;
    const yearlyMultiplier = periodDuration > 0 ? secondsInYear / periodDuration : 0;

    // Projections for each token type
    const ethProjections = {
      weekly: ethRewards * weeklyMultiplier,
      monthly: ethRewards * monthlyMultiplier,
      yearly: ethRewards * yearlyMultiplier,
    };

    const emarkProjections = {
      weekly: emarkRewards * weeklyMultiplier,
      monthly: emarkRewards * monthlyMultiplier,
      yearly: emarkRewards * yearlyMultiplier,
    };

    // APR calculations
    const ethAPR = stakedAmountNum > 0 && ethProjections.yearly > 0 
      ? (ethProjections.yearly / stakedAmountNum) * 100 
      : 0;
    
    const emarkAPR = stakedAmountNum > 0 && emarkProjections.yearly > 0 
      ? (emarkProjections.yearly / stakedAmountNum) * 100 
      : 0;

    return {
      // Current rewards (for claiming)
      current: {
        ethRewards,
        emarkRewards,
        totalRewards,
        hasClaimableRewards: totalRewards > 0.0001,
        hasEthRewards: ethRewards > 0.0001,
        hasEmarkRewards: emarkRewards > 0.0001,
      },

      // Projections (for calculator)
      projections: {
        eth: ethProjections,
        emark: emarkProjections,
      },

      // APRs
      apr: {
        eth: ethAPR,
        emark: emarkAPR,
        combined: ethAPR + emarkAPR, // Note: This is additive since they're separate reward streams
      },

      // Period info
      period: {
        ethPool: periodData.currentEthPool ? parseFloat(toEther(periodData.currentEthPool)) : 0,
        emarkPool: periodData.currentEmarkPool ? parseFloat(toEther(periodData.currentEmarkPool)) : 0,
        ethRate: periodData.currentEthRate ? parseFloat(toEther(periodData.currentEthRate)) : 0,
        emarkRate: periodData.currentEmarkRate ? parseFloat(toEther(periodData.currentEmarkRate)) : 0,
        timeUntilRebalance: periodData.timeUntilRebalance,
        periodProgress: periodData.periodEnd > periodData.periodStart 
          ? ((Date.now() / 1000 - periodData.periodStart) / (periodData.periodEnd - periodData.periodStart)) * 100
          : 0,
      },

      // User info
      user: {
        stakedAmount: stakedAmountNum,
        periodEthRewards: periodEthNum,
        periodEmarkRewards: periodEmarkNum,
      },

      // Formatting helpers
      format: {
        ethRewards: (decimals = 6) => ethRewards.toFixed(decimals),
        emarkRewards: (decimals = 6) => emarkRewards.toFixed(decimals),
        totalRewards: (decimals = 6) => totalRewards.toFixed(decimals),
        stakedAmount: (decimals = 2) => stakedAmountNum.toFixed(decimals),
        ethAPR: (decimals = 2) => ethAPR.toFixed(decimals),
        emarkAPR: (decimals = 2) => emarkAPR.toFixed(decimals),
      },
    };
  }, [
    rewardsData.pendingEthRewards,
    rewardsData.pendingEmarkRewards,
    rewardsData.stakedAmount,
    rewardsData.periodEthRewards,
    rewardsData.periodEmarkRewards,
    periodData.periodEnd,
    periodData.periodStart,
    periodData.currentEthPool,
    periodData.currentEmarkPool,
    periodData.currentEthRate,
    periodData.currentEmarkRate,
    periodData.timeUntilRebalance,
  ]);

  return {
    ...calculations,
    // Pass through the original hook data for functions like claimRewards
    originalRewardsData: rewardsData,
    originalPeriodData: periodData,
    isLoading: rewardsData.isLoadingRewards || periodData.isLoading,
    error: rewardsData.error || periodData.error,
  };
}