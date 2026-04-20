'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Package,
  Palette,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUser } from '@/context/UserContext'
import api from '@/lib/api'
import { addProduct } from '@/supabaseClient'

const STEPS = [
  { id: 1, label: 'Brand', icon: Palette },
  { id: 2, label: 'First product', icon: Package },
  { id: 3, label: 'Invite staff', icon: UserPlus },
  { id: 4, label: 'Go live', icon: Sparkles },
] as const

const COLORS = [
  { value: 'blue', className: 'bg-blue-500' },
  { value: 'purple', className: 'bg-purple-500' },
  { value: 'emerald', className: 'bg-emerald-500' },
  { value: 'orange', className: 'bg-orange-500' },
  { value: 'pink', className: 'bg-pink-500' },
  { value: 'neutral', className: 'bg-gray-600' },
]

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
}

function buildStorefrontUrl(shopName: string | undefined) {
  if (!shopName) return '#'
  const slug = slugify(shopName)
  if (typeof window === 'undefined') return '#'
  const isDev = window.location.hostname.includes('localhost')
  if (isDev) return `http://${slug}.localhost:3000`
  return `https://${slug}.supashop-ten.vercel.app`
}

export default function OnboardingWizard() {
  const router = useRouter()
  const { currentShop, refreshUser, loading: userLoading } = useUser()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const storageKey = currentShop?.id ? `onboarding_state_${currentShop.id}` : null

  const [brand, setBrand] = useState({
    heroTitle: '',
    heroSubtitle: '',
    primaryColor: 'blue',
  })

  const [product, setProduct] = useState({
    name: '',
    stock: '',
    price: '',
    costPrice: '',
  })
  const [productSaved, setProductSaved] = useState(false)

  const [roles, setRoles] = useState<{ id: string; name: string }[]>([])
  const [invite, setInvite] = useState({ email: '', roleId: '' })
  const [inviteSent, setInviteSent] = useState<string | null>(null)

  const storefrontUrl = useMemo(
    () => buildStorefrontUrl(currentShop?.name),
    [currentShop?.name]
  )

  useEffect(() => {
    if (userLoading || !currentShop?.id || loaded) return
    const load = async () => {
      let savedState: any = null
      try {
        const raw = storageKey ? localStorage.getItem(storageKey) : null
        if (raw) savedState = JSON.parse(raw)
      } catch {
        // ignore corrupt state
      }

      try {
        const shopRes = await fetch(`/api/shops/${currentShop.id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        })
        if (shopRes.ok) {
          const data = await shopRes.json()
          setBrand(
            savedState?.brand || {
              heroTitle: data.heroTitle || `Welcome to ${data.name}`,
              heroSubtitle:
                data.heroSubtitle || 'Shop our latest products with fast delivery',
              primaryColor: data.primaryColor || 'blue',
            },
          )
        }
      } catch {
        // non-fatal; keep defaults
      }
      try {
        const r = await api.roles.getAll()
        setRoles(r.map((x) => ({ id: x.id, name: x.name })))
        const staffRole = r.find((x) => x.name.toLowerCase() === 'staff')
        setInvite((prev) => ({
          ...prev,
          roleId: savedState?.invite?.roleId || staffRole?.id || r[0]?.id || '',
          email: savedState?.invite?.email || prev.email,
        }))
      } catch {
        // roles optional
      }

      if (savedState?.product) setProduct(savedState.product)
      if (savedState?.productSaved) setProductSaved(true)
      if (savedState?.inviteSent) setInviteSent(savedState.inviteSent)
      if (typeof savedState?.step === 'number' && savedState.step >= 1 && savedState.step <= 4) {
        setStep(savedState.step)
      }

      setLoaded(true)
    }
    load()
  }, [currentShop?.id, userLoading, loaded, storageKey])

  useEffect(() => {
    if (!loaded || !storageKey) return
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ step, brand, product, productSaved, invite, inviteSent }),
      )
    } catch {
      // quota exceeded or storage disabled — non-fatal
    }
  }, [loaded, storageKey, step, brand, product, productSaved, invite, inviteSent])

  const clearOnboardingState = () => {
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey)
      } catch {
        // ignore
      }
    }
  }

  if (userLoading || !currentShop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const saveBrand = async () => {
    setSaving(true)
    try {
      await api.shops.updateSettings(currentShop.id, {
        heroTitle: brand.heroTitle || undefined,
        heroSubtitle: brand.heroSubtitle || undefined,
        primaryColor: brand.primaryColor,
      })
      setStep(2)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save brand')
    } finally {
      setSaving(false)
    }
  }

  const saveProduct = async () => {
    const name = product.name.trim()
    const stock = Number(product.stock)
    const price = Number(product.price)
    const costPrice = product.costPrice ? Number(product.costPrice) : undefined
    if (!name) return toast.error('Product name is required')
    if (!Number.isFinite(price) || price <= 0) return toast.error('Enter a valid price')
    if (!Number.isFinite(stock) || stock < 0) return toast.error('Enter a valid stock')

    setSaving(true)
    try {
      const res = await addProduct(name, '', stock, price, costPrice, undefined, null)
      if (!res.success) throw new Error(res.error || 'Failed to add product')
      setProductSaved(true)
      toast.success('Product added')
      setStep(3)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add product')
    } finally {
      setSaving(false)
    }
  }

  const sendInvite = async () => {
    const email = invite.email.trim()
    if (!email) return toast.error('Enter an email to invite')
    if (!invite.roleId) return toast.error('Select a role')
    setSaving(true)
    try {
      const res = await api.staff.invite({ email, roleId: invite.roleId })
      setInviteSent(res.tempPassword ? `${email} • temp password: ${res.tempPassword}` : email)
      toast.success('Invite sent')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to invite')
    } finally {
      setSaving(false)
    }
  }

  const finish = async () => {
    setFinishing(true)
    try {
      await api.shops.completeOnboarding(currentShop.id)
      clearOnboardingState()
      await refreshUser()
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to complete onboarding')
      setFinishing(false)
    }
  }

  const skipOnboarding = async () => {
    setFinishing(true)
    try {
      await api.shops.completeOnboarding(currentShop.id)
      clearOnboardingState()
      await refreshUser()
      router.push('/dashboard')
    } catch {
      clearOnboardingState()
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Supashop" className="w-8 h-8 rounded-lg" />
            <span className="font-semibold">Supashop</span>
          </div>
          <button
            onClick={skipOnboarding}
            disabled={finishing}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
          >
            Skip for now <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <Stepper current={step} />

        <div className="mt-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8 shadow-sm">
          {step === 1 && (
            <BrandStep
              value={brand}
              onChange={setBrand}
              shopName={currentShop.name}
            />
          )}
          {step === 2 && (
            <ProductStep value={product} onChange={setProduct} />
          )}
          {step === 3 && (
            <InviteStep
              roles={roles}
              value={invite}
              onChange={setInvite}
              inviteSent={inviteSent}
              onSend={sendInvite}
              sending={saving}
            />
          )}
          {step === 4 && (
            <PreviewStep storefrontUrl={storefrontUrl} shopName={currentShop.name} />
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || saving || finishing}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < 4 ? (
            <Button
              onClick={
                step === 1
                  ? saveBrand
                  : step === 2
                  ? saveProduct
                  : () => setStep(step + 1)
              }
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {step === 2 ? 'Add product' : step === 3 ? (inviteSent ? 'Next' : 'Skip') : 'Continue'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={finishing}>
              {finishing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Go to dashboard
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center justify-between gap-2">
      {STEPS.map((s, i) => {
        const Icon = s.icon
        const done = current > s.id
        const active = current === s.id
        return (
          <li key={s.id} className="flex-1 flex items-center gap-2 min-w-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                done
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : active
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-400'
              }`}
            >
              {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
            </div>
            <span
              className={`text-sm truncate ${
                active
                  ? 'font-medium text-gray-900 dark:text-gray-100'
                  : 'text-gray-500'
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px ${
                  done ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-800'
                }`}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

function BrandStep({
  value,
  onChange,
  shopName,
}: {
  value: { heroTitle: string; heroSubtitle: string; primaryColor: string }
  onChange: (v: any) => void
  shopName: string
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Make {shopName} look like yours</h2>
        <p className="text-sm text-gray-500 mt-1">
          This is what customers see at the top of your storefront.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Hero headline</Label>
        <Input
          value={value.heroTitle}
          onChange={(e) => onChange({ ...value, heroTitle: e.target.value })}
          placeholder={`Welcome to ${shopName}`}
        />
      </div>
      <div className="space-y-2">
        <Label>Hero subtitle</Label>
        <Input
          value={value.heroSubtitle}
          onChange={(e) => onChange({ ...value, heroSubtitle: e.target.value })}
          placeholder="Shop our latest products with fast delivery"
        />
      </div>
      <div className="space-y-2">
        <Label>Primary color</Label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => onChange({ ...value, primaryColor: c.value })}
              className={`w-8 h-8 rounded-full ${c.className} ring-offset-2 dark:ring-offset-gray-900 ${
                value.primaryColor === c.value ? 'ring-2 ring-gray-900 dark:ring-white' : ''
              }`}
              aria-label={c.value}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ProductStep({
  value,
  onChange,
}: {
  value: { name: string; stock: string; price: string; costPrice: string }
  onChange: (v: any) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Add your first product</h2>
        <p className="text-sm text-gray-500 mt-1">
          You can edit, delete, or add more anytime from Products.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Product name</Label>
        <Input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="e.g. Indomie Chicken"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Sell price (₦)</Label>
          <Input
            type="number"
            inputMode="decimal"
            value={value.price}
            onChange={(e) => onChange({ ...value, price: e.target.value })}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label>Stock on hand</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={value.stock}
            onChange={(e) => onChange({ ...value, stock: e.target.value })}
            placeholder="0"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Cost price (optional)</Label>
        <Input
          type="number"
          inputMode="decimal"
          value={value.costPrice}
          onChange={(e) => onChange({ ...value, costPrice: e.target.value })}
          placeholder="0"
        />
        <p className="text-xs text-gray-500">
          Used for profit tracking. Leave blank if unsure.
        </p>
      </div>
    </div>
  )
}

function InviteStep({
  roles,
  value,
  onChange,
  inviteSent,
  onSend,
  sending,
}: {
  roles: { id: string; name: string }[]
  value: { email: string; roleId: string }
  onChange: (v: any) => void
  inviteSent: string | null
  onSend: () => void
  sending: boolean
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Invite your team</h2>
        <p className="text-sm text-gray-500 mt-1">
          Add a staff member now or skip — you can invite anyone later from Staff.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input
          type="email"
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          placeholder="teammate@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label>Role</Label>
        <select
          value={value.roleId}
          onChange={(e) => onChange({ ...value, roleId: e.target.value })}
          className="w-full h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <Button onClick={onSend} disabled={sending} variant="secondary" className="w-full">
        {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
        Send invite
      </Button>
      {inviteSent && (
        <div className="text-sm rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 p-3">
          Invited {inviteSent}
        </div>
      )}
    </div>
  )
}

function PreviewStep({
  storefrontUrl,
  shopName,
}: {
  storefrontUrl: string
  shopName: string
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">You're all set</h2>
        <p className="text-sm text-gray-500 mt-1">
          {shopName} is live. Preview your storefront or head straight to the dashboard.
        </p>
      </div>
      <a
        href={storefrontUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/60"
      >
        <div>
          <div className="text-sm font-medium">Preview storefront</div>
          <div className="text-xs text-gray-500 truncate">{storefrontUrl}</div>
        </div>
        <ExternalLink className="w-4 h-4 text-gray-500" />
      </a>
      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 pt-2">
        <li className="flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-500" /> Add more products
        </li>
        <li className="flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-500" /> Record your first sale
        </li>
        <li className="flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-500" /> Share your storefront link
        </li>
      </ul>
    </div>
  )
}
