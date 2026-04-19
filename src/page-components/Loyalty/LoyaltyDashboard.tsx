'use client'

import { useEffect, useState } from 'react'
import { Award, Coins, Loader2, Save, Users } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import api, { LoyaltyOverview } from '@/lib/api'
import { useUser } from '@/context/UserContext'

const TIER_BADGE: Record<string, string> = {
  platinum: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  gold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  silver: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  bronze: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n)
}

export default function LoyaltyDashboard() {
  const { currentShop } = useUser()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [overview, setOverview] = useState<LoyaltyOverview | null>(null)
  const [form, setForm] = useState({
    loyaltyEnabled: true,
    loyaltyPointsPerNaira: 0.01,
    loyaltyNairaPerPoint: 1,
    loyaltySilverThreshold: 1000,
    loyaltyGoldThreshold: 5000,
    loyaltyPlatinumThreshold: 10000,
  })

  const load = async () => {
    try {
      setLoading(true)
      const data = await api.loyalty.getOverview()
      setOverview(data)
      setForm({
        loyaltyEnabled: data.settings.enabled,
        loyaltyPointsPerNaira: data.settings.pointsPerNaira,
        loyaltyNairaPerPoint: data.settings.nairaPerPoint,
        loyaltySilverThreshold: data.settings.silverThreshold,
        loyaltyGoldThreshold: data.settings.goldThreshold,
        loyaltyPlatinumThreshold: data.settings.platinumThreshold,
      })
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load loyalty data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    if (!currentShop?.id) return
    if (form.loyaltySilverThreshold >= form.loyaltyGoldThreshold) {
      return toast.error('Silver threshold must be less than Gold')
    }
    if (form.loyaltyGoldThreshold >= form.loyaltyPlatinumThreshold) {
      return toast.error('Gold threshold must be less than Platinum')
    }
    setSaving(true)
    try {
      await api.loyalty.updateSettings(currentShop.id, form)
      toast.success('Loyalty settings saved')
      load()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const pointsPreview = 1000
  const nairaValue = pointsPreview * form.loyaltyNairaPerPoint

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Loyalty Program</h1>
        <p className="text-sm text-gray-500 mt-1">
          Reward repeat customers with points that convert to discounts at checkout.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Members"
          value={overview?.totalMembers.toLocaleString() ?? '0'}
        />
        <StatCard
          icon={<Coins className="w-5 h-5" />}
          label="Active points"
          value={overview?.totalActivePoints.toLocaleString() ?? '0'}
        />
        <StatCard
          icon={<Award className="w-5 h-5" />}
          label="Top tier"
          value={
            overview?.tierDistribution.find((t) => t.tier === 'platinum')?.count?.toLocaleString() ??
            '0'
          }
          sub="platinum members"
        />
      </div>

      {/* Tier breakdown */}
      {overview && overview.tierDistribution.length > 0 && (
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-3">Tier distribution</h2>
          <div className="flex flex-wrap gap-2">
            {overview.tierDistribution.map((t) => (
              <span
                key={t.tier}
                className={`text-xs px-3 py-1 rounded-full font-medium ${
                  TIER_BADGE[t.tier] || TIER_BADGE.bronze
                }`}
              >
                {t.tier.toUpperCase()} · {t.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-lg p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold">Settings</h2>
            <p className="text-sm text-gray-500">Control how customers earn and redeem points.</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="loyalty-on" className="text-sm">
              Program active
            </Label>
            <Switch
              id="loyalty-on"
              checked={form.loyaltyEnabled}
              onCheckedChange={(v) => setForm({ ...form, loyaltyEnabled: v })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Points earned per ₦1 spent</Label>
            <Input
              type="number"
              step="0.0001"
              min={0}
              value={form.loyaltyPointsPerNaira}
              onChange={(e) =>
                setForm({ ...form, loyaltyPointsPerNaira: Number(e.target.value) })
              }
              disabled={!form.loyaltyEnabled}
            />
            <p className="text-xs text-gray-500">
              e.g. <code>0.01</code> = 1 point per ₦100 spent.
            </p>
          </div>
          <div className="space-y-2">
            <Label>₦ value per point on redemption</Label>
            <Input
              type="number"
              step="0.0001"
              min={0}
              value={form.loyaltyNairaPerPoint}
              onChange={(e) =>
                setForm({ ...form, loyaltyNairaPerPoint: Number(e.target.value) })
              }
              disabled={!form.loyaltyEnabled}
            />
            <p className="text-xs text-gray-500">
              1,000 points = {formatCurrency(nairaValue)} discount at checkout.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Silver threshold (points)</Label>
            <Input
              type="number"
              min={0}
              value={form.loyaltySilverThreshold}
              onChange={(e) =>
                setForm({ ...form, loyaltySilverThreshold: Number(e.target.value) })
              }
              disabled={!form.loyaltyEnabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Gold threshold</Label>
            <Input
              type="number"
              min={0}
              value={form.loyaltyGoldThreshold}
              onChange={(e) =>
                setForm({ ...form, loyaltyGoldThreshold: Number(e.target.value) })
              }
              disabled={!form.loyaltyEnabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Platinum threshold</Label>
            <Input
              type="number"
              min={0}
              value={form.loyaltyPlatinumThreshold}
              onChange={(e) =>
                setForm({ ...form, loyaltyPlatinumThreshold: Number(e.target.value) })
              }
              disabled={!form.loyaltyEnabled}
            />
          </div>
        </div>

        <div className="flex justify-end mt-5">
          <Button onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save settings
          </Button>
        </div>
      </div>

      {/* Top members */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-lg p-5">
        <h2 className="text-lg font-semibold mb-3">Top members</h2>
        {overview && overview.topMembers.length === 0 ? (
          <p className="text-sm text-gray-500">
            No loyalty members yet. Add customers and their points will start accruing from the next sale.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-200 dark:border-gray-800">
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Tier</th>
                  <th className="py-2 pr-4 text-right">Points</th>
                  <th className="py-2 pr-4 text-right">Spent</th>
                </tr>
              </thead>
              <tbody>
                {overview?.topMembers.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-gray-100 dark:border-gray-800/60 last:border-0"
                  >
                    <td className="py-2 pr-4 font-medium">{m.name}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          TIER_BADGE[m.tier] || TIER_BADGE.bronze
                        }`}
                      >
                        {m.tier.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-right">{m.points.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(m.totalSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-lg p-5">
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  )
}
